git pull;
nx run aiwm:build;
pm2 restart core.aiwm.api00 core.aiwm.api01 core.aiwm.api02 core.aiwm.mcp00 core.aiwm.mcp01 core.aiwm.mcp02;
