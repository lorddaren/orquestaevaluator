
class YamlException(Exception):
    def __init__(self, message):

        # Call the base class constructor with the parameters it needs
        super(YamlException, self).__init__(message)


class YaqlException(Exception):
    def __init__(self, message):

        # Call the base class constructor with the parameters it needs
        super(YaqlException, self).__init__(message)
