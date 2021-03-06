/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/


var fso = WScript.CreateObject('Scripting.FileSystemObject');
var wscript_shell = WScript.CreateObject("WScript.Shell");

var args = WScript.Arguments;
// working dir
var ROOT = WScript.ScriptFullName.split('\\cordova\\lib\\target-list.js').join('');
    // path to CordovaDeploy.exe
var CORDOVA_DEPLOY_EXE = '\\cordova\\lib\\CordovaDeploy\\CordovaDeploy\\bin\\Debug\\CordovaDeploy.exe';
    // path to CordovaDeploy
var CORDOVA_DEPLOY = '\\cordova\\lib\\CordovaDeploy';

// help/usage function
function Usage() {
    Log("");
    Log("Usage: cscript target-list.js  [ --emulators | --devices | --started_emulators | --all ]");
    Log("    --emulators         : List the possible target emulators availible.");
    Log("    --devices           : List the possible target devices availible. *NOT IMPLEMENTED YET*");
    Log("    --started_emulators : List any started emulators availible. *NOT IMPLEMENTED YET*");
    Log("    --all               : List all devices returned by CordovaDeploy.exe -devices ");
    Log("examples:");
    Log("    cscript target-list.js --emulators");
    Log("    cscript target-list.js --devices");
    Log("    cscript target-list.js --started_emulators");
    Log("    cscript target-list.js --all");
    Log("");
}

// logs messaged to stdout and stderr
function Log(msg, error) {
    if (error) {
        WScript.StdErr.WriteLine(msg);
    }
    else {
        WScript.StdOut.WriteLine(msg);
    }
}

// executes a commmand in the shell
function exec(command) {
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print output? Naa.....
        if (!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadAll();
            //Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        var line = oShell.StdErr.ReadAll();
        Log(line, true);
        WScript.Quit(2);
    }
}

// returns all possible targets generated by the CordovaDeploy tool
function get_targets(path) {
    if (!fso.FileExists(path + CORDOVA_DEPLOY_EXE)) {
        cordovaDeploy(path);
    }
    wscript_shell.CurrentDirectory = path + CORDOVA_DEPLOY + '\\CordovaDeploy\\bin\\Debug';
    var cmd = 'CordovaDeploy -devices';
    var out = wscript_shell.Exec(cmd);
    while(out.Status == 0) {
        WScript.Sleep(100);
    }
    //Check to make sure our script did not encounter an error
    if (!out.StdErr.AtEndOfStream) {
        var line = out.StdErr.ReadAll();
        Log("Error calling CordovaDeploy : ", true);
        Log(line, true);
        WScript.Quit(2);
    }
    else {
        if (!out.StdOut.AtEndOfStream) {
            var line = out.StdOut.ReadAll();
            var targets = line.split('\r\n');
            //format (ID DESCRIPTION)
            for (i in targets) {
                // remove device index and separator colen
                targets[i] = targets[i].replace(/\d*\s\:\s/, '').replace(/\:\s/, '');
            }
            return targets;
        }
        else {
            Log('Error : CordovaDeploy Failed to find any devices', true);
            WScript.Quit(2);
        }
    }
}

function list_targets(path) {
    var targets = get_targets(path);
    for (i in targets) {
        Log(targets[i]);
    }
}

// lists the Device returned by CordovaDeploy (NOTE: this does not indicate that a device is connected)
function list_devices(path) {
    var targets = get_targets(path);
    var device_found = false;
    for (i in targets) {
        if (targets[i].match(/Device/)) {
            Log(targets[i]);
            device_found = true;
        }
    }
    if (device_found) {
        Log('');
        Log('WARNING : This does not mean that a device is connected, make');
        Log(' sure your device is connected before deploying to it.');
    }
}

// lists the emulators availible to CordovaDeploy
function list_emulator_images(path) {
    var targets = get_targets(path);
    for (i in targets) {
        if (targets[i].match(/Emulator/)) {
            Log(targets[i]);
        }
    }
}

// lists any started emulators *NOT IMPLEMENTED*
function list_started_emulators(path) {
    Log('ERROR : list-started-emulators is not supported on Windows Phone.', true);
    WScript.Quit(1);
}

// builds the CordovaDeploy.exe if it does not already exist 
function cordovaDeploy(path) {
    if (fso.FileExists(path + CORDOVA_DEPLOY_EXE)) {
        return;
    }

    // build CordovaDeploy.exe
    if (fso.FolderExists(path + '\\cordova') && fso.FolderExists(path + CORDOVA_DEPLOY) && 
        fso.FileExists(path + CORDOVA_DEPLOY + '\\CordovaDeploy.sln')) {
        // delete any previously generated files
        if (fso.FolderExists(path + CORDOVA_DEPLOY + "\\CordovaDeploy\\obj")) {
            fso.DeleteFolder(path + CORDOVA_DEPLOY + "\\CordovaDeploy\\obj");
        }
        if (fso.FolderExists(path + CORDOVA_DEPLOY + "\\CordovaDeploy\\Bin")) {
            fso.DeleteFolder(path + CORDOVA_DEPLOY + "\\CordovaDeploy\\Bin");
        }
        exec('msbuild ' + path + CORDOVA_DEPLOY + '\\CordovaDeploy.sln');

        if (fso.FileExists(path + CORDOVA_DEPLOY_EXE)) {
            return;
        }
        else {
            Log("ERROR: MSBUILD FAILED TO COMPILE CordovaDeploy.exe", true);
            WScript.Quit(2);
        }
    }
    else {
        Log("ERROR: CordovaDeploy.sln not found, unable to compile CordovaDeploy tool.", true);
        WScript.Quit(2);
    }
}


if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }
    else if (args.Count() > 1) {
        Log("Error: Too many arguments.", true);
        Usage();
        WScript.Quit(2);
    }
    else if (fso.FolderExists(ROOT)) {
        if (!fso.FolderExists(ROOT + '\\cordova')) {
            Log("Error: cordova tooling folder not found in project directory,", true);
            Log("could not lsit targets.", true);
            WScript.Quit(2);
        }

        if (args(0) == "--emulators" || args(0) == "-e") {
            list_emulator_images(ROOT);
        }
        else if (args(0) == "--devices" || args(0) == "-d") {
            list_devices(ROOT);
        }
        else if (args(0) == "--started_emulators" || args(0) == "-s") {
            list_started_emulators(ROOT);
        }
        else if (args(0) == "--all" || args(0) == "-a") {
            list_targets(ROOT);
        }
        else {
            Log("Error: \"" + args(0) + "\" is not recognized as a target-list option", true);
            Usage();
            WScript.Quit(2);
        }
    }
    else {
        Log("Error: Project directory not found,", true);
        Usage();
        WScript.Quit(2);
    }
}
else {
    Log("WARNING: target list not specified, showing all targets...");
    list_targets(ROOT);
}
