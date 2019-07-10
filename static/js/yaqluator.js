//dom vars
var $yamlInput = $("#yamlInput");
var $yaqlInput = $("#yaqlInput");
var $resultArea = $("#result");
var $yaqlAlert = $("#yaqlAlert");
var $yamlAlert = $("#yamlAlert");

//api
var apiServerString = "/api";
var apiEvaluate = "/evaluate/";
var autoComplete = apiServerString + "/autoComplete/";
var evalReqObj = {
    "yaml": "",
    "yaql_expression": "",
    "legacy": false
};


function setYaml(yaml) {
    $yamlInput.val(JSON.stringify(yaml, undefined, 4));
}

function evaluate(obj) {
    var url = apiServerString + apiEvaluate;
    $resultArea.html("");
    $.ajax({
        url: url,
        type: "POST",
        crossDomain: false,
        data: obj,
        dataType: "json",
        success: function (result) {
            //alert(JSON.stringify(result));
            if (result.statusCode > 0) {
                $resultArea.html(JSON.stringify(result.value, undefined, 4));
            } else {
                if (result.error && result.error.indexOf("YAQL") > -1) {
                    $yaqlAlert.html(result.error);
                    $("#yaqlAlert").css('display', 'block')
                }
                if (result.error && result.error.indexOf("YAML") > -1) {
                    $yaqlAlert.html(result.error);
                    $("#yaqlAlert").css('display', 'block')
                }
            }
        },
        error: function (xhr, status, error) {
            //alert(status);
            console.error(status);
        }
    });

}

function initYaqlInput() {

    $yaqlInput.keydown(function (event) {
        if (event.keyCode == 13) {
            $("#evaluate").click();
            return false;
        }
        if (event.keyCode != 8 && event.keyCode != 32 && event.keyCode != 46 && event.keyCode < 48) {
            return;
        }
    });
}

function output(inp) {
    document.body.appendChild(document.createElement('pre')).innerHTML = inp;
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

$( document ).ready(function() {
    $yamlInput = $("#yamlInput");
    $yaqlInput = $("#yaqlInput");
    $resultArea = $("#result");
    $yaqlAlert = $("#yaqlAlert");
    $yamlAlert = $("#yamlAlert");

    //event handlers
    $("#evaluate").click(function () {
        $("#yaqlAlert").css('display', 'none')
        evalReqObj.yaml = $yamlInput.val();
        evalReqObj.yaql_expression = $yaqlInput.val();
        evalReqObj.legacy = $("#legacy").prop('checked');
        evaluate(evalReqObj);

    });

    $("#reformat").click(function () {
        let error = '';
        try {
            let a = JSON.parse($("#yamlInput").val());
            $("#yaqlAlert").css('display', 'none');
            $("#yamlInput").val(JSON.stringify(a, null, 4));
        }
        catch (jsonerr) {
            // Unable to parse JSON, maybe this is YAML?
            try {
                let a = jsyaml.safeLoad($("#yamlInput").val());
                $("#yaqlAlert").css('display', 'none');
                $("#yamlInput").val(jsyaml.safeDump(a));
            }
            catch (yamlerr) {
                $yaqlAlert.html("Invalid JSON or YAML " + jsonerr + "\n" + yamlerr);
                $("#yaqlAlert").css('display', 'block');
            }
        }
        return false
    });

    $yaqlInput.keydown(function (event) {
        if (event.keyCode == 13) {
            $("#evaluate").click();
            return false;
        }
        if (event.keyCode != 8 && event.keyCode != 32 && event.keyCode != 46 && event.keyCode < 48) {
            return;
        }
    });
});