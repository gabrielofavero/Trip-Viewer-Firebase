// ======= Logger JS =======

const INFO = 'INFO';
const WARN = 'WARN';
const ERROR = 'ERROR';

// ======= LOGGERS =======
function _logger(type = "", message = "Hello World!") {
    switch (type) {
        case ERROR:
            try {
                let e = new Error();
                e = e.stack.split("\n")[2].split(":");
                e.pop();
                let line = ":" + e.pop();
                let caller;
                try {
                    if (message && message.includes("@at:")) {
                        caller = message.split("@at:")[1];
                        message = message.split("@at:")[0];
                    } else {
                        caller = _getCallerFile() + line;
                    }
                } catch (e) {
                    caller = _getCallerFile() + line;
                }
    
                console.log(ERROR + " | " + caller + " | " + message);
            } catch(e) {
                console.log(ERROR + " | Generic Error ");
                console.log(message);
            }
            
            break;
        case WARN:
            console.log(WARN + " | " + message);
            break;
        default:
            console.log(INFO + " | " + message);
    }
}

// ======= GETTERS =======
function _getCallerFile() {
    var originalFunc = Error.prepareStackTrace;
    var callerfile;
    try {
        var err = new Error();
        var currentfile;

        Error.prepareStackTrace = function (err, stack) {
            return stack;
        };

        currentfile = err.stack.shift().getFileName();

        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();

            if (currentfile !== callerfile) break;
        }
    } catch (e) { }

    Error.prepareStackTrace = originalFunc;

    return callerfile;
}