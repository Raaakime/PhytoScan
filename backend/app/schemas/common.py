"""Base commune des schémas : noms en camelCase dans le JSON, comme attend le front (statusLabel, diseaseName...)."""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,   # status_label (Python) <-> statusLabel (JSON)
        populate_by_name=True,      # accepte aussi les noms Python à l'entrée
        from_attributes=True,       # permet de construire depuis un objet SQLAlchemy
    )
