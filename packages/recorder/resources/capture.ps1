# Implementation: SPEC_REC_CAPTURE — audio capture helper
# Requirements: REQ_REC_SPEECH, REQ_REC_FAILURE
#
# Opens the default microphone and the default speaker output (WASAPI loopback) and writes ONE
# mixed stream to stdout: raw PCM16 LE, mono, 16 kHz, in blocks of 4096 samples, on its own clock.
# stderr: one JSON object per line (ready / source / error). Closing stdin asks it to stop.
# Nothing is written to disk. The C# is kept C# 5 compatible so it compiles under pwsh and powershell.

$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace JarvisRecorder
{
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumeratorComObject { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
        int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
        int RegisterEndpointNotificationCallback(IntPtr client);
        int UnregisterEndpointNotificationCallback(IntPtr client);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice
    {
        int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
        int OpenPropertyStore(int access, out IntPtr properties);
        int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        int GetState(out int state);
    }

    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioClient
    {
        int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionGuid);
        int GetBufferSize(out uint frames);
        int GetStreamLatency(out long latency);
        int GetCurrentPadding(out uint padding);
        int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
        int GetMixFormat(out IntPtr format);
        int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
        int Start();
        int Stop();
        int Reset();
        int SetEventHandle(IntPtr handle);
        int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioCaptureClient
    {
        int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        int ReleaseBuffer(uint frames);
        int GetNextPacketSize(out uint frames);
    }

    // One capture source (microphone or loopback of the default speaker) converted to mono 16 kHz float.
    class Source
    {
        const int OutRate = 16000;
        const int MaxQueuedSamples = OutRate * 2;
        readonly string name;
        readonly bool loopback;
        readonly object gate = new object();
        readonly List<float> queue = new List<float>();
        readonly ManualResetEvent initDone = new ManualResetEvent(false);
        volatile bool stop;
        Thread thread;

        public bool Ok;
        public volatile bool Lost;
        public string Problem;
        public Action<string> OnLost;

        public Source(string name, bool loopback) { this.name = name; this.loopback = loopback; }
        public string Name { get { return name; } }

        public void Start()
        {
            thread = new Thread(Run);
            thread.IsBackground = true;
            thread.Start();
        }

        public bool WaitInit(int ms) { return initDone.WaitOne(ms); }
        public void Stop() { stop = true; if (thread != null) { thread.Join(1500); } }

        public int Available { get { lock (gate) { return queue.Count; } } }

        // Take up to count samples (fewer when less are queued).
        public int Take(float[] dest, int count)
        {
            lock (gate)
            {
                int n = Math.Min(count, queue.Count);
                for (int i = 0; i < n; i++) { dest[i] = queue[i]; }
                queue.RemoveRange(0, n);
                return n;
            }
        }

        void Run()
        {
            IAudioClient client = null;
            IAudioCaptureClient capture = null;
            IntPtr fmt = IntPtr.Zero;
            try
            {
                IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                IMMDevice device;
                // dataFlow: 0 = render (loopback), 1 = capture; role 0 = console
                Check(enumerator.GetDefaultAudioEndpoint(loopback ? 0 : 1, 0, out device), "no default device");
                Guid iidClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
                object o;
                Check(device.Activate(ref iidClient, 23, IntPtr.Zero, out o), "activate");
                client = (IAudioClient)o;
                Check(client.GetMixFormat(out fmt), "mix format");

                int tag = Marshal.ReadInt16(fmt, 0) & 0xFFFF;
                int channels = Marshal.ReadInt16(fmt, 2);
                int rate = Marshal.ReadInt32(fmt, 4);
                int bits = Marshal.ReadInt16(fmt, 14);
                int kind = tag;
                if (tag == 0xFFFE) { kind = Marshal.ReadInt32(fmt, 24); }
                bool isFloat = kind == 3;
                if (!(isFloat && bits == 32) && !(kind == 1 && (bits == 16 || bits == 32)))
                {
                    throw new Exception("unsupported mix format (tag " + kind + ", " + bits + " bit)");
                }

                int flags = loopback ? 0x00020000 : 0;
                Check(client.Initialize(0, flags, 2000000, 0, fmt, IntPtr.Zero), "initialize");
                Guid iidCapture = new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
                object c;
                Check(client.GetService(ref iidCapture, out c), "capture service");
                capture = (IAudioCaptureClient)c;
                Check(client.Start(), "start");
                Ok = true;
                initDone.Set();

                double step = (double)rate / OutRate;
                double acc = 0, accW = 0;
                float[] frameBuf = new float[0];
                while (!stop)
                {
                    uint packet;
                    Check(capture.GetNextPacketSize(out packet), "packet size");
                    if (packet == 0) { Thread.Sleep(5); continue; }
                    while (packet > 0)
                    {
                        IntPtr data; uint frames, bflags; ulong dp, qp;
                        Check(capture.GetBuffer(out data, out frames, out bflags, out dp, out qp), "get buffer");
                        List<float> outSamples = new List<float>((int)frames / 3 + 2);
                        bool silent = (bflags & 2) != 0;
                        for (int f = 0; f < frames; f++)
                        {
                            float mono = 0;
                            if (!silent)
                            {
                                for (int ch = 0; ch < channels; ch++)
                                {
                                    int idx = f * channels + ch;
                                    if (isFloat) { mono += BitConverter.ToSingle(ReadBytes(data, idx * 4, 4), 0); }
                                    else if (bits == 16) { mono += Marshal.ReadInt16(data, idx * 2) / 32768f; }
                                    else { mono += Marshal.ReadInt32(data, idx * 4) / 2147483648f; }
                                }
                                mono /= channels;
                            }
                            // area-averaging resampler: one output sample per `step` input samples
                            double w = 1.0;
                            while (w > 1e-12)
                            {
                                double take = Math.Min(w, step - accW);
                                acc += mono * take; accW += take; w -= take;
                                if (accW >= step - 1e-9) { outSamples.Add((float)(acc / step)); acc = 0; accW = 0; }
                            }
                        }
                        Check(capture.ReleaseBuffer(frames), "release buffer");
                        lock (gate)
                        {
                            queue.AddRange(outSamples);
                            if (queue.Count > MaxQueuedSamples) { queue.RemoveRange(0, queue.Count - MaxQueuedSamples); }
                        }
                        Check(capture.GetNextPacketSize(out packet), "packet size");
                    }
                }
                try { client.Stop(); } catch (Exception) { }
            }
            catch (Exception ex)
            {
                if (!Ok) { Problem = ex.Message; initDone.Set(); }
                else if (!stop) { Lost = true; if (OnLost != null) { OnLost(name); } }
            }
            finally
            {
                if (fmt != IntPtr.Zero) { Marshal.FreeCoTaskMem(fmt); }
            }
        }

        static byte[] ReadBytes(IntPtr p, int offset, int n)
        {
            byte[] b = new byte[n];
            Marshal.Copy(new IntPtr(p.ToInt64() + offset), b, 0, n);
            return b;
        }

        static void Check(int hr, string what)
        {
            if (hr < 0) { throw new Exception(what + " failed (0x" + hr.ToString("X8") + ")"); }
        }
    }

    public static class Capture
    {
        const int BlockSamples = 4096;
        const int OutRate = 16000;
        const int JitterMs = 100;
        static Stream err;
        static readonly object errGate = new object();
        static volatile bool stopRequested;

        static void Event(string json)
        {
            lock (errGate)
            {
                byte[] b = new UTF8Encoding(false).GetBytes(json + "\n");
                err.Write(b, 0, b.Length);
                err.Flush();
            }
        }

        static string Esc(string s)
        {
            return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", " ").Replace("\n", " ");
        }

        static void WriteBlock(Stream stdout, Source mic, Source spk, int maxSamples, bool padToBlock)
        {
            float[] a = new float[BlockSamples];
            float[] b = new float[BlockSamples];
            int na = mic.Take(a, maxSamples);
            int nb = spk.Take(b, maxSamples);
            int n = padToBlock ? BlockSamples : Math.Max(na, nb);
            if (n == 0) { return; }
            byte[] bytes = new byte[n * 2];
            for (int i = 0; i < n; i++)
            {
                float v = (i < na ? a[i] : 0f) + (i < nb ? b[i] : 0f);
                if (v > 1f) { v = 1f; } else if (v < -1f) { v = -1f; }
                short s = (short)Math.Round(v * 32767f);
                bytes[2 * i] = (byte)(s & 0xFF);
                bytes[2 * i + 1] = (byte)((s >> 8) & 0xFF);
            }
            stdout.Write(bytes, 0, bytes.Length);
            stdout.Flush();
        }

        public static int Run()
        {
            err = Console.OpenStandardError();
            Stream stdout = Console.OpenStandardOutput();
            try
            {
                Source mic = new Source("mic", false);
                Source spk = new Source("speaker", true);
                Action<string> lost = delegate(string n)
                {
                    Event("{\"event\":\"source\",\"name\":\"" + n + "\",\"state\":\"lost\"}");
                };
                mic.OnLost = lost; spk.OnLost = lost;
                mic.Start(); spk.Start();
                mic.WaitInit(8000); spk.WaitInit(8000);
                Event("{\"event\":\"ready\",\"mic\":" + (mic.Ok ? "true" : "false") + ",\"speaker\":" + (spk.Ok ? "true" : "false") + "}");
                if (!mic.Ok && !spk.Ok)
                {
                    Event("{\"event\":\"error\",\"message\":\"" + Esc("no audio source: mic: " + mic.Problem + "; speaker: " + spk.Problem) + "\"}");
                    return 3;
                }

                Thread watcher = new Thread(delegate()
                {
                    try { Stream stdin = Console.OpenStandardInput(); byte[] buf = new byte[256]; while (stdin.Read(buf, 0, buf.Length) > 0) { } }
                    catch (Exception) { }
                    stopRequested = true;
                });
                watcher.IsBackground = true;
                watcher.Start();

                Stopwatch clock = Stopwatch.StartNew();
                long written = 0;
                while (!stopRequested)
                {
                    long due = (clock.ElapsedMilliseconds - JitterMs) * OutRate / 1000 / BlockSamples;
                    while (written < due && !stopRequested)
                    {
                        WriteBlock(stdout, mic, spk, BlockSamples, true);
                        written++;
                    }
                    bool micDead = !mic.Ok || mic.Lost;
                    bool spkDead = !spk.Ok || spk.Lost;
                    if (micDead && spkDead)
                    {
                        Event("{\"event\":\"error\",\"message\":\"both audio sources were lost\"}");
                        return 4;
                    }
                    Thread.Sleep(10);
                }
                // stop asked for: end the sources, then write what is left in the queues
                mic.Stop(); spk.Stop();
                while (mic.Available > 0 || spk.Available > 0) { WriteBlock(stdout, mic, spk, BlockSamples, false); }
                return 0;
            }
            catch (Exception ex)
            {
                Event("{\"event\":\"error\",\"message\":\"" + Esc(ex.Message) + "\"}");
                return 5;
            }
        }
    }
}
'@

try {
    Add-Type -TypeDefinition $source -Language CSharp
} catch {
    [Console]::Error.WriteLine('{"event":"error","message":"capture helper could not be compiled: ' + ($_.Exception.Message -replace '["\\\r\n]', ' ') + '"}')
    exit 1
}

exit ([JarvisRecorder.Capture]::Run())
