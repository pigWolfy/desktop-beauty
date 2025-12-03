param([int64]$hwnd, [int]$width = 0, [int]$height = 0, [int]$x = 0, [int]$y = 0)

Add-Type -AssemblyName System.Windows.Forms

Add-Type @'
using System;
using System.Runtime.InteropServices;

public class DesktopWallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindowW(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindowExW(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
    
    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
    
    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    
    [DllImport("user32.dll")]
    public static extern bool UpdateWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowLongPtr(IntPtr hWnd, int nIndex);
    
    [DllImport("user32.dll")]
    public static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint crKey, byte bAlpha, uint dwFlags);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public const int GWL_STYLE = -16;
    public const int GWL_EXSTYLE = -20;
    public const int WS_CHILD = 0x40000000;
    public const int WS_POPUP = unchecked((int)0x80000000);
    public const int WS_VISIBLE = 0x10000000;
    public const int WS_CLIPSIBLINGS = 0x04000000;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const int WS_EX_NOACTIVATE = 0x08000000;
    public const int WS_EX_LAYERED = 0x00080000;
    public const uint LWA_ALPHA = 0x02;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public static readonly IntPtr HWND_BOTTOM = new IntPtr(1);
    public const int SW_SHOWNA = 8;
    
    public static IntPtr workerW = IntPtr.Zero;
    public static IntPtr shellDLL_DefView = IntPtr.Zero;
    public static IntPtr progman = IntPtr.Zero;
    public static bool isRaisedDesktop = false;
    
    public static void SetupDesktopLayer() {
        progman = FindWindowW("Progman", "Program Manager");
        if (progman == IntPtr.Zero) {
            progman = FindWindowW("Progman", null);
        }
        Console.WriteLine("Progman: " + progman);
        
        // Send 0x052C to spawn WorkerW behind desktop icons
        IntPtr result;
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(0x1), 0, 1000, out result);
        System.Threading.Thread.Sleep(200);
        
        // Check if this is "raised desktop with layered shell view" (Windows 11 24H2+)
        shellDLL_DefView = FindWindowExW(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
        if (shellDLL_DefView != IntPtr.Zero) {
            int exStyle = GetWindowLong(shellDLL_DefView, GWL_EXSTYLE);
            isRaisedDesktop = (exStyle & WS_EX_LAYERED) != 0;
            Console.WriteLine("DefView in Progman, ExStyle: 0x" + exStyle.ToString("X") + ", isRaisedDesktop: " + isRaisedDesktop);
            
            if (isRaisedDesktop) {
                // Windows 11 raised desktop mode - WorkerW is inside Progman
                workerW = FindWindowExW(progman, IntPtr.Zero, "WorkerW", null);
                Console.WriteLine("WorkerW inside Progman: " + workerW);
            }
        }
        
        // If not found yet, enumerate windows to find WorkerW after SHELLDLL_DefView's parent
        if (workerW == IntPtr.Zero && !isRaisedDesktop) {
            EnumWindows((hwnd, lParam) => {
                IntPtr defView = FindWindowExW(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (defView != IntPtr.Zero) {
                    shellDLL_DefView = defView;
                    workerW = FindWindowExW(IntPtr.Zero, hwnd, "WorkerW", null);
                    Console.WriteLine("Found DefView in: " + hwnd + ", WorkerW after: " + workerW);
                }
                return true;
            }, IntPtr.Zero);
        }
        
        // Fallback to progman
        if (workerW == IntPtr.Zero) {
            workerW = progman;
        }
        
        Console.WriteLine("Target WorkerW: " + workerW);
    }
    
    public static bool EmbedWindow(IntPtr hwnd, int x, int y, int width, int height) {
        if (workerW == IntPtr.Zero) return false;
        
        Console.WriteLine("Requested position: " + x + "," + y + " size: " + width + "x" + height);
        
        if (isRaisedDesktop) {
            // Windows 11 raised desktop mode
            Console.WriteLine("Using raised desktop mode (Windows 11)");
            
            // Set window style to child
            int style = GetWindowLong(hwnd, GWL_STYLE);
            style = (style & ~WS_POPUP) | WS_CHILD | WS_VISIBLE;
            SetWindowLong(hwnd, GWL_STYLE, style);
            
            // Add WS_EX_LAYERED for transparency compatibility
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            exStyle = exStyle | WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            SetWindowLong(hwnd, GWL_EXSTYLE, exStyle);
            
            // Set fully opaque
            SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA);
            
            // Set parent to Progman (not WorkerW in raised desktop mode)
            IntPtr oldParent = SetParent(hwnd, progman);
            Console.WriteLine("SetParent result: " + oldParent);
            
            // For multi-monitor: child window coordinates are relative to parent (Progman)
            // Progman covers the entire virtual screen starting at (0,0) in its client coords
            // So we just use (0, 0) to cover the full virtual screen area
            Console.WriteLine("Setting position to (0,0) for child window spanning virtual screen");
            SetWindowPos(hwnd, shellDLL_DefView, 0, 0, width, height, SWP_NOACTIVATE);
            
        } else {
            // Traditional WorkerW mode
            Console.WriteLine("Using traditional WorkerW mode");
            
            int style = GetWindowLong(hwnd, GWL_STYLE);
            style = (style & ~WS_POPUP) | WS_CHILD | WS_VISIBLE;
            SetWindowLong(hwnd, GWL_STYLE, style);
            
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            exStyle = exStyle | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            SetWindowLong(hwnd, GWL_EXSTYLE, exStyle);
            
            SetParent(hwnd, workerW);
            // WorkerW covers virtual screen, child coords start at (0,0)
            MoveWindow(hwnd, 0, 0, width, height, true);
            SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, width, height, SWP_NOACTIVATE);
        }
        
        ShowWindow(hwnd, SW_SHOWNA);
        UpdateWindow(hwnd);
        
        return true;
    }
}
'@

# 初始化桌面层
[DesktopWallpaper]::SetupDesktopLayer()

# 获取虚拟屏幕尺寸（所有显示器组合）
if ($width -eq 0 -or $height -eq 0) {
    # 使用 SystemInformation 获取虚拟屏幕（所有显示器）
    $screenWidth = [System.Windows.Forms.SystemInformation]::VirtualScreen.Width
    $screenHeight = [System.Windows.Forms.SystemInformation]::VirtualScreen.Height
    $screenX = [System.Windows.Forms.SystemInformation]::VirtualScreen.X
    $screenY = [System.Windows.Forms.SystemInformation]::VirtualScreen.Y
} else {
    $screenWidth = $width
    $screenHeight = $height
    $screenX = $x
    $screenY = $y
}
Write-Host "Virtual screen: ${screenX},${screenY} size ${screenWidth}x${screenHeight}"

$windowHwnd = [IntPtr]$hwnd
Write-Host "Embedding window: $windowHwnd"

$result = [DesktopWallpaper]::EmbedWindow($windowHwnd, $screenX, $screenY, $screenWidth, $screenHeight)

if ($result) {
    Write-Output "SUCCESS"
    exit 0
} else {
    Write-Output "EMBED_FAILED"
    exit 1
}
