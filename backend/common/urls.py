from django.conf import settings
from django.urls import path, re_path

from . import views
from .webpack_proxy import webpack_bundles_proxy


app_name = "common"
urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
]

if settings.DEBUG:
    urlpatterns.insert(
        0,
        path(
            "frontend/webpack_bundles/<path:asset_path>",
            webpack_bundles_proxy,
            name="webpack_bundles_dev",
        ),
    )

urlpatterns.append(
    re_path(
        r"^(?!api/|admin/|media/|jsreverse/|static/|frontend/).*$",
        views.IndexView.as_view(),
        name="spa",
    ),
)
