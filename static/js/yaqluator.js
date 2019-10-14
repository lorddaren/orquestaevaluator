//dom vars
var $yamlInput = $("#yamlInput");
var $yaqlInput = $("#yaqlInput");
var $resultArea = $("#result");
var $yaqlAlert = $("#yaqlAlert");
var $yamlAlert = $("#yamlAlert");
var $st2Host = $("#st2Host");
var $st2Key = $("#st2Key");
var $st2Execution = $("#st2Execution");

//api
var apiServerString = "/api";
var apiEvaluate = "/evaluate/";
var autoComplete = apiServerString + "/autoComplete/";
var evalReqObj = {
    "yaml": "",
    "yaql_expression": "",
    "st2_host": "",
    "st2_key": "",
    "st2_execution": "",
    "legacy": false
};


function setYaml(yaml) {
        try {
            let a = JSON.parse(JSON.stringify(yaml));
            $("#yaqlAlert").css('display', 'none');
            $("#yamlInput").val(JSON.stringify(a, null, 4));
        }
        catch (jsonerr) {
            // Unable to parse JSON, maybe this is YAML?
            try {
                let a = jsyaml.safeLoad(yaml);
                $("#yaqlAlert").css('display', 'none');
                $("#yamlInput").val(jsyaml.safeDump(a));
            }
            catch (yamlerr) {
                $yaqlAlert.html("Invalid JSON or YAML " + jsonerr + "\n" + yamlerr);
                $("#yaqlAlert").css('display', 'block');
            }
        }
}

function setResultArea(json) {
    $resultArea.removeData();
    $resultArea.rainbowJSON({json: JSON.stringify(json)})
}

function evaluate(obj) {
    var url = apiServerString + apiEvaluate;
    $.ajax({
        url: url,
        type: "POST",
        crossDomain: false,
        data: obj,
        dataType: "json",
        success: function (result) {
            //alert(JSON.stringify(result));
            if (result.statusCode > 0) {
                setResultArea(result.value.evaluation);
                setYaml(result.value.payload);
            } else {
                if (result.error) {
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
    $st2Host = $("#st2Host");
    $st2Key = $("#st2Key");
    $st2Execution = $("#st2Execution");
    $resultArea = $("#result");
    $yaqlAlert = $("#yaqlAlert");
    $yamlAlert = $("#yamlAlert");

    $resultArea.rainbowJSON({
        maxElements: 0,
        maxDepth: 0,
        json: '{}'
    });
    //event handlers
    $("#evaluate").click(function () {
        $("#yaqlAlert").css('display', 'none')
        evalReqObj.yaml = $yamlInput.val();
        evalReqObj.yaql_expression = $yaqlInput.val();
        evalReqObj.st2_host = $st2Host.val();
        evalReqObj.st2_key = $st2Key.val();
        evalReqObj.st2_execution = $st2Execution.val();
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

    $st2Execution.keydown(function (event) {
        if ($st2Execution.val().length > 0) {
            $yamlInput.prop('disabled', true);
        } else {
            $yamlInput.prop('disabled', false);
        }
    })
});