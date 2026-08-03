#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from typing import Any, List


class ModelListSerializer:
    """Utility class for serializing and deserializing lists of models."""

    @staticmethod
    def deserialize(modelClass: Any, dataList: List[dict]) -> List[Any]:
        """Convert a list of dictionaries to a list of models using `model_class.fromDict()`."""
        return [modelClass.fromDict(data) for data in dataList]

    @staticmethod
    def serialize(modelList: List[Any]) -> List[dict]:
        """Convert a list of models to a list of dictionaries."""
        return [model.toDict() for model in modelList]

