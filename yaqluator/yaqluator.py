import types

import yaql
import yaql.legacy
import yaml
from flask import escape

from yaql.language import exceptions
from yaml.parser import ParserError
try:
    from utils.exceptions import YamlException, YaqlException
except:
    from ..utils.exceptions import YamlException, YaqlException


def evaluate(expression, data):
    """
    Evaluate the given YAQL expression on the given YAML
    :param str expression: the YAQL expression
    :param str|dict data: the YAML/JSON (as a string or dict (json))
    :return: the query result
    :rtype: str
    :raises YamlException: if the input YAML is invalid
    :raises YaqlException: if the YAQL is malformed
    """

    # Parse YAML
    try:
        loaded_yaml = yaml.safe_load(data) if isinstance(data, str) else data
    except yaml.parser.ParserError as pe:
        raise YamlException("Invalid YAML: " + str(pe))
    except Exception as e:
        raise YamlException("Exception loading YAML: " + str(e))

    # Evaluate YAQL expression against the YAML
    try:
        # res = _evaluate(yaql_expression, loaded_yaml, legacy)
        # if isinstance(res, types.GeneratorType):
        #     res = list(res)
        from orquesta.expressions.base import validate, evaluate

        # Replace \n with a space so we can have easier-to-read expressions
        expression = expression.replace("\n", " ")

        res = validate(expression)
        if len(res['errors']) > 0:
            raise Exception("Invalid Expression: {}".format('\n'.join(res['errors'])))
        else:
            res = evaluate(expression, loaded_yaml)
        return {'evaluation': escape(res), 'payload': loaded_yaml}
    except yaql.language.exceptions.YaqlParsingException as pe:
        raise YaqlException("Invalid expression: " + str(pe))
    except Exception as e:
        raise YaqlException("Exception evaluating expression: " + str(e))


def _get_matched_values(partial_value, sub_value):
    return [key for key in partial_value.keys() if key.startswith(sub_value)]


def auto_complete(yaql_expression, yaml_string, legacy=False):
    """
    Returns complement suggestions to the given YAQL expression
    :param str yaql_expression: the YAQL expression
    :param str | dict yaml_string:
    :return: dictionary with two keys:
        "yaql_valid"- is the YAQL expressio valid?
        "suggestions"- list of suggestions
    :rtype: dict
    """
    yaql_exp_valid = True
    res = []
    try:
        if yaql_expression[-1] != "]":
            if yaql_expression.count("[") > yaql_expression.count("]"):
                # we are in a middle of $....[ ...
                first_dlr_index = yaql_expression.rfind("$")
                expression_prefix = yaql_expression[:first_dlr_index - 1]
                sub_value = yaql_expression[first_dlr_index + 2:]
            else:
                # only dots
                last_dot_index = yaql_expression.rindex(".")
                sub_value = yaql_expression[last_dot_index + 1:]
                expression_prefix = yaql_expression[:last_dot_index]

            partial_value = evaluate(expression_prefix, yaml_string, legacy)

            res = []
            if partial_value:
                if isinstance(partial_value, list) or isinstance(partial_value, types.GeneratorType):
                    for index, item in enumerate(list(partial_value)):
                        if isinstance(item, list):
                            res.extend(range(len(item)))
                        elif isinstance(item, dict):
                            res.extend(_get_matched_values(item, sub_value))
                elif isinstance(partial_value, dict):
                    res = _get_matched_values(partial_value, sub_value)
    except (YamlException, YaqlException):
        pass

    try:
        evaluate(yaql_expression, yaml_string)
    except YaqlException:
        yaql_exp_valid = False

    return {
        "yaql_valid": yaql_exp_valid,
        "suggestions": list(set(res))
    }

