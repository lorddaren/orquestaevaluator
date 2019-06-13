//dom vars
var $yamlInput = $("#yamlInput");
var $yaqlInput = $("#yaqlInput");
var $exampleDropDown = $("#exampleDropDown");
var $resultArea = $("#result");
var $yaqlAlert = $("#yaqlAlert");
var $yamlAlert = $("#yamlAlert");

//api
//var apiServerString = "http://127.0.0.1:5000";
var apiServerString = "/api";
var apiListExample = "/examples/";
var apiEvaluate = "/evaluate/";
var apiExampleName = "/examples/";
var autoComplete = apiServerString + "/autoComplete/";
var evalReqObj = {
    "yaml": "",
    "yaql_expression": "",
    "legacy": false
};

//methods
/**
 * @param args [hitType, eventCategory, eventAction, eventLabel, eventValue]
 */
function ga_send(args) {
    if (typeof ga == 'function') {
        args.splice(0, 0, 'send');
        ga.apply(window, args);
    }
}

function contactUs() {
    ga_send(['event', 'contact-us', 'contact-us-email']);
    window.open('http://www.google.com/recaptcha/mailhide/d?k\07501oEv-WCbjRcvjwi6IYnuxWQ\75\75\46c\75T_zEuodiHDnHFr7SCIDLdl1eZ5DmNKeclK_TNeCB2pg\075', '', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=500,height=300');
}

function initDropdown() {
    var url = apiServerString + apiListExample;
    $.ajax({
        url: url,
        type: "get",
        dataType: "json",
        success: function (result) {
            var results = result.examples;
            $exampleDropDown.select2({data: results});

        },
        error: function (xhr, status, error) {
            //alert(status);
            console.error(status);
        }
    });

}

function toggleError($alertDiv, addError) {
    if (addError) {
        $alertDiv.parents('.y-container').addClass('has-error');
    } else {
        $alertDiv.parents('.y-container').removeClass('has-error');
        // empty the error
        $alertDiv.html("");
    }
}

function setYaml(yaml) {
    $yamlInput.val(JSON.stringify(yaml, undefined, 4));
}

function selectTextareaLine(tarea, lineNum) {
    lineNum--; // array starts at 0
    var lines = tarea.value.split("\n");

    // calculate start/end
    var startPos = 0;
    for (var x = 0; x < lines.length; x++) {
        if (x == lineNum) {
            break;
        }
        startPos += (lines[x].length + 1);

    }

    var endPos = lines[lineNum].length + startPos;

    // do selection
    // Chrome / Firefox

    if (typeof(tarea.selectionStart) != "undefined") {
        tarea.focus();
        tarea.selectionStart = startPos;
        tarea.selectionEnd = endPos;
        return true;
    }

    // IE
    if (document.selection && document.selection.createRange) {
        tarea.focus();
        tarea.select();
        var range = document.selection.createRange();
        range.collapse(true);
        range.moveEnd("character", endPos);
        range.moveStart("character", startPos);
        range.select();
        return true;
    }

    return false;
}

function evaluate(obj) {
    var url = apiServerString + apiEvaluate;
    toggleError($yaqlAlert, false);
    toggleError($yamlAlert, false);
    $resultArea.val("");

    $.ajax({
        url: url,
        type: "POST",
        crossDomain: false,
        data: obj,
        dataType: "json",
        success: function (result) {
            //alert(JSON.stringify(result));
            if (result.statusCode > 0) {
                $resultArea.val(JSON.stringify(result.value, undefined, 4));
            } else {
                if (result.error && result.error.indexOf("YAQL") > -1) {
                    $yaqlAlert.html(result.error);
                    toggleError($yaqlAlert, true);
                }
                if (result.error && result.error.indexOf("YAML") > -1) {
                    $yamlAlert.html(result.error);
                    toggleError($yamlAlert, true);

                    // Check if the error message contains line and column and find the last occurrence
                    // Example error message:
                    // Invalid YAML: while parsing a flow mapping in "", line 11, column 9: { ^ expected ',' or '}', but got '' in "", line 16, column 13: "tenantId": "c2edb9de95964f8ca45 ... ^
                    var pattern = /line (\d*), column (\d*)/gm;
                    var lastMatch = null;
                    while (match = pattern.exec(result.error)) {
                        lastMatch = match;
                    }
                    // If there is a line and column in the error message
                    if (lastMatch != null) {
                        lineNumber = lastMatch[1];
                        charNumber = lastMatch[2];
                        // Select the line
                        selectTextareaLine(document.getElementById("yamlInput"), lineNumber);
                    }
                }
            }
        },
        error: function (xhr, status, error) {
            //alert(status);
            console.error(status);
        }
    });

    ga_send(['event', 'evaluate', 'evaluate-yaql', $yaqlInput.val()]);
}

function initYaqlInput() {

    $yaqlInput.keyup(function (event) {
        if (event.keyCode == 13) {
            $("#evaluate").click();
        }
        if (event.keyCode != 8 && event.keyCode != 32 && event.keyCode != 46 && event.keyCode < 48) {
            return;
        }
        // Cancel the current request and clear future ones
        $.ajaxq.abort("yaqlInputKeyupAjaxQueue");
        console.log("Sending autocomplete with YAQL expression " + $yaqlInput.val());
        toggleError($yaqlAlert, false);
        // Add a new AJAX request to the queue
        $.ajaxq("yaqlInputKeyupAjaxQueue", {
            url: autoComplete,
            type: "POST",
            crossDomain: false,
            data: {"yaml": $yamlInput.val(), "yaql_expression": $yaqlInput.val()},
            dataType: "json",
            success: function (result) {
                var suggestions = [];
                if (result.statusCode > 0) {
                    var currentValue = $yaqlInput.val();
                    var prefix = currentValue.substring(0, currentValue.lastIndexOf("."));
                    suggestions = result.value.suggestions.map(function (item) {
                        return prefix + "." + item
                    });

                    toggleError($yaqlAlert, result.value.yaql_valid == false);

                }
                console.log("Suggestions for YAQL expression " + $yaqlInput.val() + " are: " + suggestions);

                $yaqlInput.typeahead('destroy');
                $yaqlInput.typeahead({source: suggestions, items: 'all', showHintOnFocus: true});
                $yaqlInput.focus(); // this fixes dropdown closes on mouseleave
                $yaqlInput.typeahead('lookup');
                initYaqlInput();
            },
            error: function (xhr, status, error) {
                //alert(status);
                console.error(status);
            }
        });
    });
}

function handleFiles() {
    var file = $("#fileInput")[0].files[0];
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
        $yamlInput.val(evt.target.result);
        //setYaml(evt.target.result);
    };
    reader.onerror = function (evt) {
        $yamlAlert.html("error reading file");
    };
    ga_send(['event', 'yaml-input', 'browse-file']);
}

function initAboutImage(itemId, url) {
    var img = new Image(),
    container = document.getElementById(itemId);

    img.onload = function () { container.appendChild(img); };
    img.src = url;
    img.alt = "...";
}

$(function () {

    $yamlInput = $("#yamlInput");
    $yaqlInput = $("#yaqlInput");
    $exampleDropDown = $("#exampleDropDown");
    $resultArea = $("#result");
    $yaqlAlert = $("#yaqlAlert");
    $yamlAlert = $("#yamlAlert");

//event handlers
    $(document).on('click', '#evaluate', function () {
        evalReqObj.yaml = $yamlInput.val();
        evalReqObj.yaql_expression = $yaqlInput.val();
        evalReqObj.legacy = $("#legacy").prop('checked');
        evaluate(evalReqObj);

    });

    $exampleDropDown.change(function () {
        var exampleName = $(this).val();
        if (exampleName == "") {
            $yamlInput.val("");
            return;
        }

        $yamlInput.prop('readonly', true);
        var url = apiServerString + apiExampleName + exampleName;
        $.ajax({
            url: url,
            type: "get",
            crossDomain: true,
            dataType: "jsonp",
            success: function (result) {
                //alert(JSON.stringify(result));
                //$yamlInput.val(JSON.stringify(result.value, undefined, 4));
                setYaml(result.value);
                $yamlInput.prop('readonly', false);

            },
            error: function (xhr, status, error) {
                //alert(status);
                console.error(status);
                $yamlInput.prop('readonly', false);
            }
        });

        ga_send(['event', 'yaml-input', 'example-select', exampleName]);
    });


//main
    initDropdown();

    initYaqlInput();

    $("#fileInput").on("change", handleFiles, false);

// Google Analytics (only when running on real website)
    if (document.location.hostname.search("yaqluator.com") !== -1) {
        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function () {
                    (i[r].q = i[r].q || []).push(arguments)
                }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

        ga('create', 'UA-65411362-3', 'auto');
        ga('send', 'pageview');
    }

    for ( var index = 1; index <= 5; index++ ) {
        initAboutImage("imageItem" + index, "static/images/CloudBand-PyKathon-2015_" + index + ".jpg");
    }

});
