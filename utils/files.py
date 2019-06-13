import os
import json

curr_path = os.path.abspath(__file__)
curr_dir = os.path.split(curr_path)[0]


def list_examples():
    files = os.listdir(os.path.join(curr_dir, "..", "examples"))
    return [filename.replace('.json', '') for filename in files]


def get_example(example_name):
    with open(os.path.join(curr_dir, "..", "examples/", example_name+".json"), "r") as file:
        return json.load(file)
