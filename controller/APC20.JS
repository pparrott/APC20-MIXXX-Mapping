/*********************************************************
 ****** Akai APC20 functions mapping for MIXXX V2.2.0 *****
 ****** Author: pparrott **********************************
 ****** Mapping version: 1.0 ******************************
 *********************************************************/

/***** Notes: ********************************************
 *****/

var APC = {};

//Global variables
APC.eqset = ["HOLD", "HOLD"];
APC.scratchstatus = "OFF";
APC.decksel = 0;

// init and shutdown functions to ensure 
// that the controller is hooked up correctly
APC.init = function () {
    // add new LEDs to this as they are added so that they are enabled on startup
    // add in order [status, control, LED]
    var LEDarray = [
        [0x90, 0x39, 0x02], //play
        [0x94, 0x39, 0x02],
        [0x90, 0x38, 0x05], //cue
        [0x94, 0x38, 0x05],
        [0x91, 0x35, 0x03], //headphone cue
        [0x95, 0x35, 0x03],
        [0x92, 0x35, 0x05], //sync
        [0x96, 0x35, 0x05],
        [0x93, 0x35, 0x03], //keylock
        [0x97, 0x35, 0x03],
        [0x92, 0x38, 0x03], //tempo up/down
        [0x91, 0x38, 0x03],
        [0x96, 0x38, 0x03],
        [0x95, 0x38, 0x03],
        [0x90, 0x35, 0x01], //track load
        [0x94, 0x35, 0x01],
        [0x90, 0x34, 0x01], //scratchselect buttons
        [0x94, 0x34, 0x01],
    ];
    for (var i in LEDarray) {
        //engine.beginTimer(10*i,function() {
        //  midi.sendShortMsg(LEDarray[i][0],LEDarray[i][1],LEDarray[i][2]);
        //},true);
        midi.sendShortMsg(LEDarray[i][0], LEDarray[i][1], LEDarray[i][2]);
        print(i);
    }
};

APC.shutdown = function () {
    // copy in LEDarray from init function after each new add, and change midi note out to 0x00
    var LEDarray = [
        [0x90, 0x39, 0x00],
        [0x94, 0x39, 0x00],
        [0x90, 0x38, 0x00],
        [0x94, 0x38, 0x00],
        [0x91, 0x35, 0x00],
        [0x95, 0x35, 0x00],
        [0x92, 0x35, 0x00],
        [0x96, 0x35, 0x00],
        [0x93, 0x35, 0x00],
        [0x97, 0x35, 0x00],
        [0x92, 0x38, 0x00],
        [0x91, 0x38, 0x00],
        [0x96, 0x38, 0x00],
        [0x95, 0x38, 0x00],
        [0x90, 0x35, 0x00],
        [0x94, 0x35, 0x00],
        [0x90, 0x34, 0x00],
        [0x94, 0x34, 0x00],
    ];
    for (var i in LEDarray) {
        midi.sendShortMsg(LEDarray[i][0], LEDarray[i][1], LEDarray[i][2]);
    }
};

APC.startupLED = function (i, array) {
    midi.sendShortMsg(array[i][0], array[i][1], array[i][2]);
};

APC.PlayLED = function (channel, control, value, status, group) {
    //Behaviour of LEDs upon RELEASE of play button    
    var playstatus = engine.getParameter(group, "play");

    if (playstatus == 1) {
        midi.sendShortMsg(status + 16, control, 0x01);
    } else {
        midi.sendShortMsg(status + 16, control, 0x02);
    }
};

APC.cue = function (channel, control, value, status, group) {
    var i = 0;
    if (status < 144) {
        status = status + 16;
        i = 1;
        midi.sendShortMsg(status, control + 1, 0x02);
    }
    engine.setValue(group, "cue_default", 1 - i);
    midi.sendShortMsg(status, control, 0x05);
};

APC.Scratchwheel = function (channel, control, value, status, group) {

    //Use midi control info to determine CW and CCW values
    //CW: 0 -> 64
    //CCW: 65 -> 127
    var newvalue;

    if (value < 64) {
        newvalue = value;
    } else {
        newvalue = value - 128;
    }

    if (APC.decksel == 0) {
        if (newvalue > 0) {
            engine.setValue("[Library]", "MoveDown", 1);
        } else if (newvalue < 0) {
            engine.setValue("[Library]", "MoveUp", 1);
        }
    } else {
        engine.scratchTick(APC.decksel, newvalue);
    }
};

APC.Songwheel_select = function (channel, control, value, status, group) {
    var playstatus = engine.getParameter(group, "play");
    status = status + 16;

    if (playstatus == 1) {
        midi.sendShortMsg(status, control, 0x04);
        engine.beginTimer(750, function () {
            midi.sendShortMsg(status, control, 0x01);
        }, true);
    } else {
        engine.setValue(group, "LoadSelectedTrack", 1);
        midi.sendShortMsg(status, control, 0x02);
        engine.beginTimer(750, function () {
            midi.sendShortMsg(status, control, 0x01);
        }, true);
    }
};

APC.eqsel = function (channel, control, value, status, group) {
    //This function changes the parameter (hi/med/lo) able to be affected by APC.eq
    //Change the note off message to behave as a note on
    if (status < 144) {
        status = status + 16;
    }

    var j = 0;
    //Change this line if moving from channel 2 for deck 1 eq
    if (status != 145) {
        j = 1;
    }

    //Turn off all LEDs to focus on selected parameter

    for (var i = 0; i < 3; i++) {
        midi.sendShortMsg(status, 0x30 + i, 0x00);
    }

    var eqselect = control - 0x30 + 1;

    if (APC.eqset[j] == "parameter" + eqselect)
    //Set parameter to 12 and turn off parameter control if already selected...
    {
        engine.setValue(group, APC.eqset[j], 1);
        APC.eqset[j] = "HOLD";
    } else
    //...enable parameter control if not already selected
    {
        APC.eqset[j] = "parameter" + eqselect;
        midi.sendShortMsg(status, control, 0x01);
    }
};

APC.eq = function (channel, control, value, status, group) {
    var j = 1;
    //Change this next line if moving EQ to something other than channel 2
    if (status == 177) {
        j = 0;
    }
    if (APC.eqset[j] == "HOLD") {
        return;
    }

    //This formula lets the parameter knob behave linearly
    var setting = Math.pow(value, 2) / 4032;
    engine.softTakeover(group, APC.eqset[j], true);
    engine.setValue(group, APC.eqset[j], setting);
};

APC.headcueLED = function (channel, control, value, status, group) {
    var cuestatus = engine.getParameter(group, "pfl");
    status = status + 16;

    if (cuestatus == 1) {
        midi.sendShortMsg(status, control, 0x01);
    } else {
        midi.sendShortMsg(status, control, 0x03);
    }

};

APC.syncLED = function (channel, control, value, status, group) {
    var syncstatus = engine.getParameter(group, "sync_enabled");
    status = status + 16;
    if (syncstatus == 1) {
        midi.sendShortMsg(status, control, 0x01);
    } else {
        midi.sendShortMsg(status, control, 0x05);
    }
};

APC.keylockLED = function (channel, control, value, status, group) {
    var keylockstatus = engine.getParameter(group, "keylock");
    status = status + 16;
    if (keylockstatus == 1) {
        midi.sendShortMsg(status, control, 0x01);
    } else {
        midi.sendShortMsg(status, control, 0x03);
    }
};

APC.rateLED = function (channel, control, value, status, group) {
    status = status + 16;
    midi.sendShortMsg(status, control, 0x03);
};

APC.scratchready = function (channel, control, value, status, group) {

    // check to see if the button will turn off the deck currently enabled
    if (status < 144) {
        midi.sendShortMsg(status + 16, control, 0x01);
        var deckcheck = 1 / 4 * (status - 128) + 1;
        if (deckcheck == APC.decksel) {
            engine.scratchDisable(APC.decksel, true);
            APC.decksel = 0;
        } else {
            return;
        }
    }

    // if another deck isn't already selected..
    else if (APC.decksel == 0) {
        APC.decksel = 1 / 4 * (status - 144) + 1;
        engine.scratchEnable(APC.decksel, 128, 100 / 3, 0.125, 0.125 / 32, true);
    } else {
        return;
    }
};