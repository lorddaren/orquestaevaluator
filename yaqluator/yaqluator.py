import types

import yaql
import yaql.legacy
import yaml

from yaql.language import exceptions
from yaml.parser import ParserError
try:
    from utils.exceptions import YamlException, YaqlException
except:
    from ..utils.exceptions import YamlException, YaqlException


def _evaluate(yaql_expression, yaml_data, legacy=False):
    engine_options = {
        'yaql.limitIterators': 100,
        'yaql.convertSetsToLists': True,
        'yaql.memoryQuota': 10000
    }

    if legacy:
        factory = yaql.legacy.YaqlFactory()
        context = yaql.legacy.create_context()
        context['legacy'] = True
    else:
        factory = yaql.YaqlFactory()
        context = yaql.create_context()

    parser = factory.create(options=engine_options)
    return parser(yaql_expression).evaluate(yaml_data, context)


def evaluate(yaql_expression, yaml_string, legacy=False):
    """
    Evaluate the given YAQL expression on the given YAML
    :param str yaql_expression: the YAQL expression
    :param str|dict yaml_string: the YAML/JSON (as a string or dict (json))
    :return: the query result
    :rtype: str
    :raises YamlException: if the input YAML is invalid
    :raises YaqlException: if the YAQL is melformed
    """

    # Parse YAML
    try:
        loaded_yaml = yaml.load(yaml_string) if isinstance(yaml_string, str) else yaml_string
    except yaml.parser.ParserError as pe:
        raise YamlException("Invalid YAML: " + str(pe))
    except Exception as e:
        raise YamlException("Exception loading YAML: " + str(e))

    # Evaluate YAQL expression against the YAML
    try:
        res = _evaluate(yaql_expression, loaded_yaml, legacy)
        if isinstance(res, types.GeneratorType):
            res = list(res)
        return res
    except yaql.language.exceptions.YaqlParsingException as pe:
        raise YaqlException("Invalid YAQL expression: " + str(pe))
    except Exception as e:
        raise YaqlException("Exception evaluating YAQL expression: " + str(e))


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

