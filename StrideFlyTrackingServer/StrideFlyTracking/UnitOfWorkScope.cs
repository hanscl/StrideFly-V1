using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StrideFlyModel;
using System.Threading;
using StrideFlyLogging;

namespace StrideFlyTracking
{
    public sealed class UnitOfWorkScope : IDisposable
    {
        private LogService sfLogger;

        [ThreadStatic]
        private static UnitOfWorkScope _currentScope;
        private StrideFlyEntities _sfContext;
        private bool _isDisposed, _saveAllChangesAtEndOfScope;

        public bool SaveAllChangesAtEndOfScope
        {
            get { return _saveAllChangesAtEndOfScope; }
            set { _saveAllChangesAtEndOfScope = value; }
        }

        /// <summary>
        /// Returns a reference to the NorthwindObjectContext that is created for the current scope.
        /// If no scope currently exists, null is returned.
        /// </summary>
        internal static StrideFlyEntities CurrentStrideFlyContext
        {
            get { return _currentScope != null ? _currentScope._sfContext : null; }
        }

        /// <summary>
        /// Default constructor. Object changes are not automatically saved at the end of the scope.
        /// </summary>
        public UnitOfWorkScope() : this(false, null)
        {
        }

        /// <summary>
        /// Parameterized constructor.
        /// </summary>
        /// <param name="saveAllChangesAtEndOfScope">
        /// A boolean value that indicates wether to automatically save all object changes at the end of the scope.
        /// </param>
        public UnitOfWorkScope(bool saveAllChangesAtEndOfScope, LogService xLogger)
        {
            if (_currentScope != null && !_currentScope._isDisposed)
                throw new InvalidOperationException("ObjectContextScope instances cannot be nested.");

            sfLogger = xLogger;
            _saveAllChangesAtEndOfScope = saveAllChangesAtEndOfScope;

            if (sfLogger != null)
                sfLogger.WriteMessage("UNITOFWORKSCOPE", LogType.Info, "Creating new UnitOFWorkScope");

            // Here we create the instance of our context
            _sfContext = new StrideFlyEntities();
            _isDisposed = false;
            Thread.BeginThreadAffinity();
            // Set the current scope to this UnitOfWorkScope objetc
            _currentScope = this;
        }

        /// <summary>
        /// Called on the end of the scope. Disposes the StrideFly context (This is important)!
        /// </summary>
        public void Dispose()
        {
            if (!_isDisposed)
            {
                if (sfLogger != null)
                    sfLogger.WriteMessage("UNITOFWORKSCOPE", LogType.Info, "Disposing of stuff. Yes!");

                // end of scope => clear the thread static scope member
                _currentScope = null;
                Thread.EndThreadAffinity();
                if (_saveAllChangesAtEndOfScope)
                    _sfContext.SaveChanges();
                /* dispose of our context */
                _sfContext.Dispose();
                _isDisposed = true;
            }
        }
    }
}
