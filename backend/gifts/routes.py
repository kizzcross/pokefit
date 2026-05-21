from .views import GiftNotificationViewSet


routes = [
    {"regex": r"gifts", "viewset": GiftNotificationViewSet, "basename": "gift"},
]
