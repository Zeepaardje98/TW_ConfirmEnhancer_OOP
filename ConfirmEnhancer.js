function msToDatetimeLocal(ms) {
    goalDate = new Date(ms);
    string = (goalDate.getFullYear() + "-" +
             ("0" + (goalDate.getMonth() + 1)).slice(-2) + "-" +
             ("0" + goalDate.getDate()).slice(-2) + " " +
             ("0" + goalDate.getHours()).slice(-2) + ":" +
             ("0" + goalDate.getMinutes()).slice(-2) + ":" +
             ("0" + goalDate.getSeconds()).slice(-2));
    return string;
}


Incomings = {
    settings: null,
    remember: false,
    delay: 0,
    init: function() {
        this.loadSettings();
        this.createTable(() => {
            document.getElementById("remember2").checked = this.remember;
            document.getElementById("delay").value = parseInt(this.delay);
            this.retrieveInput();
        });

    },
    updateSettings: function() {
        if (this.remember) {
            this.settings.remember = this.remember;
            this.settings.delay = this.delay;
        }
        else {
            this.settings.remember = false;
            this.settings.delay = 0;
        }
        localStorage.setItem(game_data.world + 'confirmenhancersettings', JSON.stringify(this.settings));
    },
    loadSettings: function() {
        var settings = JSON.parse(localStorage.getItem(game_data.world + 'confirmenhancersettings')) || {};
        if (localStorage.getItem(game_data.world + 'confirmenhancersettings') === null) {
            settings.delay = 0;
            settings.remember = false;
            localStorage.setItem(game_data.world + 'confirmenhancersettings', JSON.stringify(settings));
        }
        this.settings = settings;
        this.remember = this.settings.remember;
        this.delay = this.settings.delay;
    },
    retrieveInput: function() {
        delay.addEventListener("input", () => {
            this.delay = parseInt(document.getElementById("delay").value);
            this.updateSettings();
        });
        remember2.addEventListener("input", () => {
            this.remember = document.getElementById("remember2").checked;
            this.updateSettings();
        });
    },
    createTable: function(_callback) {
        var form = document.getElementById("command-data-form");
        var villageUrl = document.getElementById("command-data-form").getElementsByClassName("village_anchor")[0].getElementsByTagName("a")[0].href;

        var parent = this;
        $.get(villageUrl, function(html) {
            // Get the commands from a different page and show them on the
            // current page
            commands = $(html).find("#commands_outgoings, #commands_incomings")[0];
            if (commands) {
                var delay = document.createElement("delay");
                delay.innerHTML = ("<div style='width:100%; height:20px'></div><div width=100%>delay: <input type='number' id='delay' style='width: 100px;'/>     remember: <input type='checkbox' id='remember2'/></div>");
                form.appendChild(delay);
                form.appendChild(commands);
                _callback();
            }

            // Select a command, Change color of selected Command. Update
            // the selected time/date
            $(".command-row").click(function() {
                $(this).closest("tbody").find("td").css('background-color', '');
                $(this).find("td").css("background-color", "white");
                parent.fillSnipeTool($(this).find("td")[1].textContent);
            });

            // Add the timer for the command arrivel countdowns
            $(".widget-command-timer").addClass("timer");
            Timing.tickHandlers.timers.initTimers('widget-command-timer');
        });
    },
    /* NOTE This doesnt trigger the eventlisteners which update the input of
     *      the snipetool. Fix this */
    fillSnipeTool: function(timestring) {
        // Get the time and ms where you want the command to arrive
        ms = timestring.slice(-7, -4);
        time = timestring.slice(-16, -8);

        var currentdate = new Date();
        var date;
        // Command has to arrive today, set date to today
        if (timestring.slice(0, 1) == "v") {
            date = new Date(currentdate.getUTCFullYear(), currentdate.getUTCMonth(), currentdate.getUTCDate());
        }
        // Command has to arrive tomorrow, set date to tomorrow
        else if (timestring.slice(0, 1) == "m") {
            date = new Date(currentdate.getUTCFullYear(), currentdate.getUTCMonth(), currentdate.getUTCDate());
            date.setDate(date.getDate() + 1);
        }
        // Command has to arrive on a specific date, set this date
        else if (timestring.slice(0, 1) == "o") {
            var month = parseInt(timestring.slice(6, 8)) - 1;
            var day = parseInt(timestring.slice(3, 5));

            var year = currentdate.getUTCFullYear();
            if (month < currentdate.getMonth()) {
                year += 1
            }

            date = new Date(year, month, day);
        }

        // Create the exact arrivel time of the command and fill the forms with
        // this time.
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                        time.slice(0, 2), time.slice(3, 5), time.slice(6, 8), ms);
        date.setMilliseconds(date.getMilliseconds() + this.delay);

        // Get walk time
        if (document.getElementById("command-data-form").getElementsByClassName("vis")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr")[2].getElementsByTagName("td")[0].innerHTML === "Speler:") {
            // Sending to a player, duration is 4th <tr> element
            walktime = document.getElementById("command-data-form").getElementsByClassName("vis")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr")[3].getElementsByTagName("td")[1].innerHTML;
        } else {
            // Attacking a barbarian, duration is 3rd <tr> element
            walktime = document.getElementById("command-data-form").getElementsByClassName("vis")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr")[2].getElementsByTagName("td")[1].innerHTML;
        }
        string = '{"snipe_time": "' + msToDatetimeLocal(date.getTime()) +
                 '","snipe_ms": "' + date.getMilliseconds() +
                 '","walk_time": "' + walktime + '"}';
        navigator.clipboard.writeText(string)
    }
}

/* Function setting up the confirm enhancer. Also checks when to
 * stop updating the script(this happens automatically when you stop sending
 * your attack, but this takes a while. When sending an attack you want the
 * updating bar to stop as soon as possible, to get an idea of how accurate
 * your timing was).
 */
function startScript() {
    Incomings.init();

    $("#troop_confirm_go").click(function() {
        console.log("sent at", Timing.getCurrentServerTime() % 1000, "ms");
        clearInterval(update);
        Incomings.updateSettings();
    });
}

/* When on the rally point, you can immedietly start the script*/
if (document.getElementById("date_arrival")) {
    startScript();
} else {
    /* When on the map, check if the user is opening an attack window before
     * starting the script. The script_started statement prevents a bug where
     * the script is being started twice. */
    var script_started = false;
    var x = new MutationObserver(function (e) {
        if (e[0].removedNodes && document.getElementById("date_arrival") && !script_started) {
            script_started = true;
            startScript();
        } else if (!document.getElementById("date_arrival")) {
            script_started = false;
        }
    });
    x.observe(document.getElementById('ds_body'), { childList: true });
}
