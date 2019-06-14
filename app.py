from flask import Flask, request, jsonify, current_app, render_template

# Custom
from functools import wraps
import traceback
import sys
from yaqluator import yaqluator
from utils import files

app = Flask(__name__, static_url_path='/static')

def jsonp(func):
    """Wraps JSONified output for JSONP requests."""
    @wraps(func)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            data = str(func(*args, **kwargs).data)
            content = str(callback) + '(' + data + ')'
            mimetype = 'application/javascript'
            return current_app.response_class(content, mimetype=mimetype)
        else:
            return func(*args, **kwargs)
    return decorated_function

@app.route("/api/evaluate/", methods=['POST'])
@jsonp
def handle_evaluate():
    data = request.json or request.form
    if data is None:
        return json_error_response("yaml and yaql_expression are missing in request body")
    if not "yaql_expression" in data:
        return json_error_response("yaql_expression is missing")
    if not "yaml" in data:
        return json_error_response("yaml is missing")
    legacy = str(data.get("legacy", False)).lower() == "true"
    return invoke(yaqluator.evaluate, {"yaql_expression": data["yaql_expression"], "yaml_string": data["yaml"], "legacy": legacy})


@app.route("/api/autoComplete/", methods=['POST'])
@jsonp
def handle_auto_complete():
    data = request.json or request.form
    if data is None:
        return json_error_response("yaml and yaql_expression are missing in request body")
    if not "yaql_expression" in data:
        return json_error_response("yaql_expression is missing")
    if not "yaml" in data:
        return json_error_response("yaml is missing")
    legacy = str(data.get("legacy", False)).lower() == "true"
    return invoke(yaqluator.auto_complete, {"yaql_expression": data["yaql_expression"], "yaml_string": data["yaml"], "legacy":legacy})


@app.route("/examples/", methods=["GET"])
@jsonp
def list_examples():
    return invoke(files.list_examples, value_key="examples")


@app.route("/api/examples/<example_name>", methods=["GET"])
@jsonp
def get_example(example_name):
    # if "exampleName" not in request.args:
    #     return json_error_response("example name is missing")
    return invoke(files.get_example, {"example_name": example_name})


def invoke(function, params=None, value_key="value"):
    try:
        params = params or {}
        response = function(**params)
        ret = {"statusCode": 1, value_key: response}
    except Exception as e:
        #print format_exception(e)
        ret = error_response(str(e))

    return jsonify(**ret)

def json_error_response(message):
    return jsonify({"statusCode": -1, "error": message})

def error_response(message):
    return {"statusCode": -1, "error": message}

def format_exception(e):
    exception_list = traceback.format_stack()
    exception_list = exception_list[:-2]
    exception_list.extend(traceback.format_tb(sys.exc_info()[2]))
    exception_list.extend(traceback.format_exception_only(sys.exc_info()[0], sys.exc_info()[1]))

    exception_str = "Traceback (most recent call last):\n"
    exception_str += "".join(exception_list)
    # Removing the last \n
    exception_str = exception_str[:-1]

    return exception_str

@app.route('/')
def doit(name=None):
    return render_template('index.html', name=name)


if __name__ == '__main__':
    app.run()
