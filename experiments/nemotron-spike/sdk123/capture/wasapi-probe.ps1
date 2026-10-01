# Capture probe: default microphone + speaker loopback (WASAPI) from a PowerShell process, no files, no admin.
# Plays a sample through the default output after 1.5 s so the loopback has signal and the mic can show acoustic pickup.
# Usage: pwsh -File wasapi-probe.ps1 [-Seconds 8] [-Wav ..\samples\sample-mixed.wav]
param([int]$Seconds = 8, [string]$Wav = (Join-Path $PSScriptRoot '..\..\samples\sample-mixed.wav'))

$src = @'
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class CaptureResult {
    public string Name, Format, Error;
    public long Packets, Frames, SilentFrames;
    public double FirstDataMs = -1;
    public double[] Rms = new double[64];
}

public static class Wasapi {
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
        [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
        [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
    }
    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
        [PreserveSig] int OpenPropertyStore(int access, out IntPtr properties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out int state);
    }
    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioClient {
        [PreserveSig] int Initialize(int shareMode, int streamFlags, long hnsBufferDuration, long hnsPeriodicity, IntPtr format, ref Guid sessionGuid);
        [PreserveSig] int GetBufferSize(out uint frames);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint padding);
        [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
        [PreserveSig] int GetMixFormat(out IntPtr format);
        [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minPeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr handle);
        [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }
    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioCaptureClient {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devPos, out ulong qpcPos);
        [PreserveSig] int ReleaseBuffer(uint frames);
        [PreserveSig] int GetNextPacketSize(out uint frames);
    }

    [DllImport("winmm.dll", CharSet = CharSet.Unicode)] static extern bool PlaySound(string sound, IntPtr module, uint flags);
    public static void Play(string path) { PlaySound(path, IntPtr.Zero, 0x00020001 | 0x0001); } // SND_FILENAME | SND_ASYNC

    static void Check(int hr, string what) { if (hr != 0) throw new Exception(what + " failed, HRESULT 0x" + hr.ToString("X8")); }

    // dataFlow: 0 = render endpoint opened in loopback mode (speaker output), 1 = capture endpoint (microphone)
    public static CaptureResult Capture(int dataFlow, int seconds) {
        var r = new CaptureResult { Name = dataFlow == 0 ? "speaker-loopback" : "microphone" };
        try {
            var en = (IMMDeviceEnumerator)new MMDeviceEnumerator();
            IMMDevice dev; Check(en.GetDefaultAudioEndpoint(dataFlow, 0, out dev), "GetDefaultAudioEndpoint");
            Guid iidClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"); object o;
            Check(dev.Activate(ref iidClient, 23, IntPtr.Zero, out o), "Activate");
            var ac = (IAudioClient)o;
            IntPtr pf; Check(ac.GetMixFormat(out pf), "GetMixFormat");
            int tag = (ushort)Marshal.ReadInt16(pf, 0), ch = Marshal.ReadInt16(pf, 2), rate = Marshal.ReadInt32(pf, 4), bits = Marshal.ReadInt16(pf, 14);
            bool isFloat = tag == 3 || (tag == 0xFFFE && Marshal.ReadInt32(pf, 24) == 3);
            r.Format = rate + " Hz, " + ch + " ch, " + bits + " bit " + (isFloat ? "float" : "int");
            Guid none = Guid.Empty;
            Check(ac.Initialize(0, dataFlow == 0 ? 0x00020000 : 0, 10000000L, 0, pf, ref none), "Initialize");
            Guid iidCap = new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"); object so;
            Check(ac.GetService(ref iidCap, out so), "GetService");
            var cap = (IAudioCaptureClient)so;
            var sw = System.Diagnostics.Stopwatch.StartNew();
            Check(ac.Start(), "Start");
            double[] sumSq = new double[64]; long[] cnt = new long[64];
            while (sw.Elapsed.TotalSeconds < seconds) {
                Thread.Sleep(10);
                uint n;
                while (cap.GetNextPacketSize(out n) == 0 && n > 0) {
                    IntPtr data; uint frames, flags; ulong dp, qp;
                    Check(cap.GetBuffer(out data, out frames, out flags, out dp, out qp), "GetBuffer");
                    int w = Math.Min(63, (int)(sw.Elapsed.TotalSeconds * 2));
                    int samples = (int)frames * ch;
                    r.Packets++; r.Frames += frames;
                    if (r.FirstDataMs < 0) r.FirstDataMs = sw.Elapsed.TotalMilliseconds;
                    if ((flags & 2) != 0) { r.SilentFrames += frames; cnt[w] += samples; }
                    else if (isFloat && bits == 32) {
                        var f = new float[samples]; Marshal.Copy(data, f, 0, samples);
                        double s = 0; foreach (var x in f) s += x * x; sumSq[w] += s; cnt[w] += samples;
                    } else if (bits == 16) {
                        var sh = new short[samples]; Marshal.Copy(data, sh, 0, samples);
                        double s = 0; foreach (var x in sh) { double v = x / 32768.0; s += v * v; } sumSq[w] += s; cnt[w] += samples;
                    }
                    cap.ReleaseBuffer(frames);
                }
            }
            ac.Stop();
            for (int i = 0; i < 64; i++) r.Rms[i] = cnt[i] > 0 ? Math.Sqrt(sumSq[i] / cnt[i]) : double.NaN;
        } catch (Exception e) { r.Error = e.Message; }
        return r;
    }

    public static CaptureResult[] Both(int seconds) {
        var res = new CaptureResult[2];
        var t0 = new Thread(() => res[0] = Capture(0, seconds)); var t1 = new Thread(() => res[1] = Capture(1, seconds));
        t0.SetApartmentState(ApartmentState.MTA); t1.SetApartmentState(ApartmentState.MTA);
        t0.Start(); t1.Start();
        Thread.Sleep(1500); Play(PlayPath);
        t0.Join(); t1.Join();
        return res;
    }
    public static string PlayPath;
}
'@
Add-Type -TypeDefinition $src -Language CSharp
[Wasapi]::PlayPath = (Resolve-Path $Wav).Path
"PowerShell $($PSVersionTable.PSVersion) LanguageMode=$($ExecutionContext.SessionState.LanguageMode)"
$res = [Wasapi]::Both($Seconds)
foreach ($r in $res) {
    "--- $($r.Name)"
    if ($r.Error) { "ERROR: $($r.Error)"; continue }
    "format: $($r.Format); packets=$($r.Packets) frames=$($r.Frames) silentFrames=$($r.SilentFrames) firstData=$([int]$r.FirstDataMs) ms"
    $line = for ($i = 0; $i -lt [Math]::Min(2 * $Seconds, 64); $i++) { if ([double]::IsNaN($r.Rms[$i])) { '  --  ' } else { '{0,6:N4}' -f $r.Rms[$i] } }
    "RMS per 0.5 s: " + ($line -join ' ')
}
