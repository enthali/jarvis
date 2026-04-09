# T-4: Exit with code 1 to trigger the error toast + Output Channel log.
# Expected: Jarvis shows an error notification with the job name and "exit 1".
Write-Output "T-4: About to exit with code 1"
exit 1
