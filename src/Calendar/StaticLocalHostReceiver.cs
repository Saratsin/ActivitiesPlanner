using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;

namespace TelegramBot.Calendar;

public class StaticLocalHostReceiver : ICodeReceiver
{
    /// <summary>Close HTML tag to return the browser so it will close itself.</summary>
    internal const string DefaultClosePageResponse =
        @"<html>
  <head><title>OAuth 2.0 Authentication Token Received</title></head>
  <body>
    Received verification code. You may now close this window. SUUUUUUPER
  </body>
</html>";

    public async Task<AuthorizationCodeResponseUrl> ReceiveCodeAsync(AuthorizationCodeRequestUrl url,
        CancellationToken taskCancellationToken)
    {
        var authorizationUrl = url.Build().AbsoluteUri;
        // The listener type depends on platform:
        // * .NET desktop: System.Net.HttpListener
        // * .NET Core: LimitedLocalhostHttpServer (above, HttpListener is not available in any version of netstandard)
        using var listener = StartListener();
        Console.WriteLine("Open a browser with \"{0}\" URL", authorizationUrl);
        bool browserOpenedOk;
        try
        {
            browserOpenedOk = OpenBrowser(authorizationUrl);
        }
        catch (Exception e)
        {
            Console.WriteLine("Failed to launch browser with \"{0}\" for authorization. {1}", authorizationUrl,
                e.Message);
            throw new NotSupportedException(
                $"Failed to launch browser with \"{authorizationUrl}\" for authorization. See inner exception for details.",
                e);
        }

        if (!browserOpenedOk)
        {
            Console.WriteLine("Failed to launch browser with \"{0}\" for authorization; platform not supported.",
                authorizationUrl);
            throw new NotSupportedException(
                $"Failed to launch browser with \"{authorizationUrl}\" for authorization; platform not supported.");
        }

        var ret = await GetResponseFromListener(listener, taskCancellationToken).ConfigureAwait(false);

        return ret;
    }

    public string RedirectUri => "http://localhost:5000/";

    private async Task<AuthorizationCodeResponseUrl> GetResponseFromListener(HttpListener listener,
        CancellationToken ct)
    {
        HttpListenerContext context;
        // Set up cancellation. HttpListener.GetContextAsync() doesn't accept a cancellation token,
        // the HttpListener needs to be stopped which immediately aborts the GetContextAsync() call.
        using (ct.Register(listener.Stop))
        {
            // Wait to get the authorization code response.
            try
            {
                context = await listener.GetContextAsync().ConfigureAwait(false);
            }
            catch (Exception) when (ct.IsCancellationRequested)
            {
                ct.ThrowIfCancellationRequested();
                // Next line will never be reached because cancellation will always have been requested in this catch block.
                // But it's required to satisfy compiler.
                throw new InvalidOperationException();
            }
            //CallbackUriChooser.Default.ReportSuccess(_callbackUriTemplate);
        }

        var coll = context.Request.QueryString;

        // Write a "close" response.
        var bytes = Encoding.UTF8.GetBytes(DefaultClosePageResponse);
        context.Response.ContentLength64 = bytes.Length;
        context.Response.SendChunked = false;
        context.Response.KeepAlive = false;
        var output = context.Response.OutputStream;
        await output.WriteAsync(bytes, 0, bytes.Length).ConfigureAwait(false);
        await output.FlushAsync().ConfigureAwait(false);
        output.Close();
        context.Response.Close();

        // Create a new response URL with a dictionary that contains all the response query parameters.
        return new AuthorizationCodeResponseUrl(coll.AllKeys.ToDictionary(k => k, k => coll[k]));
    }

    protected virtual bool OpenBrowser(string url)
    {
        // See https://github.com/dotnet/corefx/issues/10361
        // This is best-effort only, but should work most of the time.
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // See https://stackoverflow.com/a/6040946/44360 for why this is required
            url = Regex.Replace(url, @"(\\*)" + "\"", @"$1$1\" + "\"");
            url = Regex.Replace(url, @"(\\+)$", @"$1$1");
            Process.Start(new ProcessStartInfo("cmd", $"/c start \"\" \"{url}\"") { CreateNoWindow = true });
            return true;
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            Process.Start("xdg-open", url);
            return true;
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            Process.Start("open", url);
            return true;
        }

        return false;
    }

    private HttpListener StartListener()
    {
        var listener = new HttpListener();
        listener.Prefixes.Add(RedirectUri);
        listener.Start();
        return listener;
    }
}