git pull;
nx run iam:build;
pm2 restart core.iam.api00 core.iam.api01 core.iam.api02;
