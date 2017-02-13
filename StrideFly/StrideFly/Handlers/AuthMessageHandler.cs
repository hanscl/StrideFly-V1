using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Text;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Web;
using StrideFly.Common;

namespace StrideFly.Handlers
{
    public class AuthMessageHandler : DelegatingHandler
    {
        private string _userName;

        // Capturinhg the incoming request by overriding teh SendAsync Method
        protected override System.Threading.Tasks.Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            // if the credentials are validated, set the CurrentPrincipal and Current.User
            if (ValidateCredentials(request.Headers.Authorization))
            {
                Thread.CurrentPrincipal = new StrideFlyPrincipal(_userName);
                HttpContext.Current.User = new StrideFlyPrincipal(_userName);
            }

            // Execute base.SendAsync to execute default actions and once it is completed,
            // capture the response objec and add www-authenticate header is the request
            // was marked as unauthorized
            return base.SendAsync(request, cancellationToken).ContinueWith(task =>
            {
                HttpResponseMessage response = task.Result;
                if (response.StatusCode == HttpStatusCode.Unauthorized && !response.Headers.Contains("WWW-Authenticate"))
                {
                    response.Headers.Add("WWW-Authenticate", "Basic");
                }
                return response;
            });
        }

        // Method to validate credentials from Authorization header value
        private bool ValidateCredentials(AuthenticationHeaderValue authenticationHeaderVal)
        {
            if (authenticationHeaderVal != null && !String.IsNullOrEmpty(authenticationHeaderVal.Parameter))
            {
                string[] decodedCredentials = Encoding.ASCII.GetString(Convert.FromBase64String(authenticationHeaderVal.Parameter)).Split(new[] { ':' });

                //now decodedCredentials[0] will contain username and decodedCredentials[1] will contain password.
                // Implement logic to verify credentials (i.e. query DB). For now used hardcoded values.
                if (decodedCredentials[0].Equals("hansel76") && decodedCredentials[1].Equals("ragnar13"))
                {
                    _userName = "su";
                    return true; // authenticated
                }
            }

            return false; // not authenticated
            
            
        }
    }
}