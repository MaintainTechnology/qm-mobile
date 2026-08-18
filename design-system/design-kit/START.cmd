@echo off
rem Serves the design kit over HTTP and opens the presentation wall.
rem Needed because browsers block the fetch() that loads sibling .dc.html
rem files when a page is opened from file:// (double-clicking the HTML).
cd /d "%~dp0"
set PORT=8123
start "design-kit server" /min cmd /c "python -m http.server %PORT% 2>nul || py -m http.server %PORT% 2>nul || npx -y http-server -p %PORT% -c-1"
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/QuoteMax%%20Mobile%%20Screens.dc.html"
