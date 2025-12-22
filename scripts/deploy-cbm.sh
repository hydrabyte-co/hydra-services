# !/bin/bash
git pull;
nx run cbm:build;
pm2 restart core.cbm.api00 core.cbm.api01 core.cbm.api02;
