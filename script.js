// Copyright Stephan Hügel, 2011

// This file is part of MefIgnore.
//
// MefIgnore is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// MefIgnore is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with MefIgnore. If not, see <http://www.gnu.org/licenses/>.



//add a trim method to the string object's prototype
String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, "");
};

safari.self.addEventListener("message", getMessage, false);
// event listener for incoming requested messages from global.js
safari.self.tab.dispatchMessage("getSettingValue", "blacklist");
// ask for value from global.js, since only it can interact with the Safari object directly
function getMessage(msgEvent) {

    if (msgEvent.name == "settingValueIs") retrieved = msgEvent.message;
    storeBlacklist(retrieved);
}



function storeBlacklist(bl) {
    if ("user1,user2,user3" != bl) {
        console.log("Writing user-defined blacklist values to local storage");
        console.log("Values: " + bl);
        bl = bl.trim();
        //strip leading and trailing whitespace
        localStorage.clear();
        //clear all local storage, since we're currently only using one field
        try {
            localStorage.setItem("ignorelist", bl);
        } catch(e) {
            console.log("Couldn't write local storage item. I think this \
is a bug, and am proceeding with ignored-user comment removal anyway.");
            localStorage.clear();
            kill(bl);
            return;
        }

        kill(bl);
    } else
    // default values present: extension is in use for the first time, or post-update
    if (localStorage.getItem("ignorelist")) {
        //stored values exist, so use those, and restore them to the user prefs
        console.log("Retrieving local storage blacklist values: ");
        kl = localStorage.getItem("ignorelist");
        //strip leading and trailing whitespace
        kl = kl.trim();
        console.log("Retrieved values: " + kl + " … restoring your preferences");
        safari.self.tab.dispatchMessage("setSettingValue", "blacklist?" + kl);
        //using ? to delimit in order to avoid splitting the values
        kill(kl);
    } else
    //no stored values were found, and the default is in use, so alert the user
    alert("You haven't defined any users to ignore, please go to the MefIgnore extension preferences,\
and add some.");

}

function check_comma(str) {
    // remove a trailing comma from a string
    var outstr = ((str.charAt(str.length-1,1) == ",") ? str.substring(0, str.length-1) : str);
      return outstr;
}


function kill(users) {
    var allTables, thisTable, matchTable;
    var users_arr = users.split(",");
    // trim leading whitespace (from e.g. 'user1, user2')
    for (var i = 0; i < users_arr.length; i++) {
        users_arr[i] = check_comma(users_arr[i].trim());
        if (users_arr[i] == "") {
            //remove an empty string caused by a trailing comma
            users_arr.splice(i,1);
        }
    }
    var cleanList = "'" + users_arr.join("') or contains(.,'") + "'";
    matchTable = "//*[\
(self::a and following-sibling::*[1][self::div and span/a[contains(.," + cleanList +")]]) or \
(self::div and span/a[contains(.," + cleanList + ")]) or \
(self::br and preceding-sibling::*[1][self::div and span/a[contains(.," + cleanList + ")]]) or \
(self::br and preceding-sibling::*[2][self::div and span/a[contains(.," + cleanList + ")]])]";
    allTables = document.evaluate(
        matchTable,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);
    console.log("Number of comments expunged: " + allTables.snapshotLength);
    for (var j = 0; j < allTables.snapshotLength; j++) {
        thisTable = allTables.snapshotItem(j);
        thisTable.parentNode.removeChild(thisTable);
        //not hidden, expunged. That's right.
    }
}
