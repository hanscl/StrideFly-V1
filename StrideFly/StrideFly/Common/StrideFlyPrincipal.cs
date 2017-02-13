using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Security.Principal;

namespace StrideFly.Common
{
    public class StrideFlyPrincipal : IPrincipal
    {
        public string UserName { get; set; }
        public IIdentity Identity {get;set;}
        
        public bool IsInRole(string role)
        {
            if (role.Equals("su"))
                return true;
            else
                return false;
        }

        public StrideFlyPrincipal(string userName)
        {
            UserName = userName;
            Identity = new GenericIdentity(userName);
        }
    }
}