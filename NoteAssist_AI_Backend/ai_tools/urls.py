from django.urls import path

from .views import AIToolsViewSet

urlpatterns = [
	path('generate/', AIToolsViewSet.as_view({'post': 'generate'}), name='ai-tools-generate'),
	path('improve/', AIToolsViewSet.as_view({'post': 'improve'}), name='ai-tools-improve'),
	path('summarize/', AIToolsViewSet.as_view({'post': 'summarize'}), name='ai-tools-summarize'),
	path('code/', AIToolsViewSet.as_view({'post': 'code'}), name='ai-tools-code'),

	path('outputs/', AIToolsViewSet.as_view({'get': 'outputs'}), name='ai-tools-outputs'),
	path('outputs/<int:pk>/', AIToolsViewSet.as_view({'get': 'retrieve_output', 'delete': 'delete_output'}), name='ai-tools-output-detail'),
	path('outputs/<int:pk>/save/', AIToolsViewSet.as_view({'post': 'save_to_note'}), name='ai-tools-output-save'),
	path('outputs/<int:pk>/download/', AIToolsViewSet.as_view({'get': 'download_output'}), name='ai-tools-output-download'),
	path('outputs/<int:pk>/upload-to-drive/', AIToolsViewSet.as_view({'post': 'upload_to_drive'}), name='ai-tools-output-upload'),

	path('usage-history/', AIToolsViewSet.as_view({'get': 'usage_history'}), name='ai-tools-usage-history'),
	path('quota/', AIToolsViewSet.as_view({'get': 'quota'}), name='ai-tools-quota'),
]
