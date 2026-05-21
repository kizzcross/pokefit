"""
Copie este arquivo para exercises_seed.py e preencha a lista EXERCISES.

  cp workouts/data/exercises_seed.example.py workouts/data/exercises_seed.py

Depois rode:

  poetry run python manage.py seed_exercises
  poetry run python manage.py seed_exercises --dry-run
  poetry run python manage.py seed_exercises --file workouts/data/exercises_seed.py

Campos por exercício
--------------------
name            (obrigatório) Nome único no catálogo
slug            (opcional)    Identificador estável; se omitido, gera do name
description     (opcional)    Resumo curto (até 255 caracteres)
instructions    (opcional)    Passo a passo / dicas
muscle_group    (obrigatório) chest | back | legs | shoulders | arms | core | cardio | full_body | mobility
difficulty      (obrigatório) beginner | intermediate | advanced
equipment       (opcional)    Ex: "Barra", "Halteres", "Peso corporal"
video_url       (opcional)    URL do vídeo
image_path      (opcional)    Caminho local da imagem (relativo ao arquivo ou absoluto)
is_active       (opcional)    True (padrão) ou False para ocultar do catálogo
"""

EXERCISES: list[dict] = [
    {
        "name": "Agachamento livre",
        "slug": "agachamento-livre",
        "description": "Agachamento com barra nas costas.",
        "instructions": (
            "1. Barra apoiada no trapézio.\n"
            "2. Desça até coxa paralela ao chão.\n"
            "3. Suba mantendo o core firme."
        ),
        "muscle_group": "legs",
        "difficulty": "intermediate",
        "equipment": "Barra, rack",
        "video_url": "",
        "image_path": "",  # ex: "workouts/data/images/agachamento.jpg"
        "is_active": True,
    },
    {
        "name": "Supino reto com barra",
        "description": "Peito — supino no banco reto.",
        "muscle_group": "chest",
        "difficulty": "intermediate",
        "equipment": "Barra, banco reto",
    },
    {
        "name": "Remada curvada",
        "muscle_group": "back",
        "difficulty": "beginner",
        "equipment": "Barra ou halteres",
    },
]
