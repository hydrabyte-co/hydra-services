/**
 * Generated MongoDB script to sync Docker containers to resources
 * Auto-generated from docker_containers_details.json
 */

const ORG_ID = ObjectId('692ff5fa3371dad36b287ec5');
const USER_ID = ObjectId('692ff5fa3371dad36b287ec4');
const NODE_ID = ObjectId('6931711bd436a16167c4c5f1');

print('========================================');
print('Syncing Docker Containers to Resources');
print('========================================');
print('Total Containers: 7');
print('');

let successCount = 0;
let errorCount = 0;



// Container 1/7: qwen25-7b
try {
  const resource0 = {
    name: 'qwen25-7b',
    description: 'Container: qwen25-7b:latest',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "inference-container",
  "registry": "local",
  "imageName": "qwen25-7b",
  "imageTag": "latest",
  "containerPorts": [
    {
      "containerPort": 3901,
      "hostPort": 3901,
      "protocol": "tcp"
    }
  ],
  "volumeMounts": [
    {
      "hostPath": "qwen25-7b-service_huggingface-cache",
      "containerPath": "/root/.cache/huggingface",
      "mode": "rw"
    }
  ],
  "envVars": {
    "TRANSFORMERS_CACHE": "/root/.cache/huggingface",
    "PATH": "/opt/conda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "NVIDIA_VISIBLE_DEVICES": "all",
    "NVIDIA_DRIVER_CAPABILITIES": "compute,utility",
    "LD_LIBRARY_PATH": "/usr/local/nvidia/lib:/usr/local/nvidia/lib64",
    "PYTORCH_VERSION": "2.1.0"
  },
  "networkMode": "qwen25-7b-service_default",
  "restartPolicy": "unless-stopped",
  "inferenceServer": "triton",
  "modelRepository": "Qwen/Qwen2.5-7B",
  "gpuDeviceIds": [
    "1"
  ]
},
    runtime: {
      id: '999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3',
      endpoint: 'http://localhost:3901',
      allocatedGPU: ["1"],
      allocatedCPU: null,
      allocatedRAM: null,
      startedAt: new Date('2025-12-03T00:58:23.118719925Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-inference': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing0 = db.resources.findOne({ 'runtime.id': '999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3' });

  if (existing0) {
    db.resources.updateOne(
      { _id: existing0._id },
      { $set: resource0 }
    );
    print('✅ [1/7] Updated: qwen25-7b');
  } else {
    db.resources.insertOne(resource0);
    print('✅ [1/7] Inserted: qwen25-7b');
  }

  print('   Type: inference-container');
  print('   Image: qwen25-7b:latest');
  print('   Ports: 3901:3901');
  print('   GPUs: 1');
  print('');
  successCount++;
} catch (error) {
  print('❌ [1/7] Error: qwen25-7b: ' + error.message);
  errorCount++;
}


// Container 2/7: vbd-llama2
try {
  const resource1 = {
    name: 'vbd-llama2',
    description: 'Container: vbd-llama2:latest',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "inference-container",
  "registry": "local",
  "imageName": "vbd-llama2",
  "imageTag": "latest",
  "containerPorts": [
    {
      "containerPort": 3904,
      "hostPort": 3904,
      "protocol": "tcp"
    }
  ],
  "volumeMounts": [
    {
      "hostPath": "vbd-llama2-service_huggingface-cache",
      "containerPath": "/root/.cache/huggingface",
      "mode": "rw"
    }
  ],
  "envVars": {
    "TRANSFORMERS_CACHE": "/root/.cache/huggingface",
    "PATH": "/opt/conda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "NVIDIA_VISIBLE_DEVICES": "all",
    "NVIDIA_DRIVER_CAPABILITIES": "compute,utility",
    "LD_LIBRARY_PATH": "/usr/local/nvidia/lib:/usr/local/nvidia/lib64",
    "PYTORCH_VERSION": "2.1.0"
  },
  "networkMode": "vbd-llama2-service_default",
  "restartPolicy": "unless-stopped",
  "inferenceServer": "triton",
  "modelRepository": "LR-AI-Labs/vbd-llama2-7B-50b-chat",
  "gpuDeviceIds": [
    "0"
  ]
},
    runtime: {
      id: 'c98f12e9fca2f9bce744be2dd48d3b1f8567ecf4a4e4672e9fdd0258b56fa53a',
      endpoint: 'http://localhost:3904',
      allocatedGPU: ["0"],
      allocatedCPU: null,
      allocatedRAM: null,
      startedAt: new Date('2025-12-03T00:58:23.119690225Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-inference': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing1 = db.resources.findOne({ 'runtime.id': 'c98f12e9fca2f9bce744be2dd48d3b1f8567ecf4a4e4672e9fdd0258b56fa53a' });

  if (existing1) {
    db.resources.updateOne(
      { _id: existing1._id },
      { $set: resource1 }
    );
    print('✅ [2/7] Updated: vbd-llama2');
  } else {
    db.resources.insertOne(resource1);
    print('✅ [2/7] Inserted: vbd-llama2');
  }

  print('   Type: inference-container');
  print('   Image: vbd-llama2:latest');
  print('   Ports: 3904:3904');
  print('   GPUs: 0');
  print('');
  successCount++;
} catch (error) {
  print('❌ [2/7] Error: vbd-llama2: ' + error.message);
  errorCount++;
}


// Container 3/7: yolov8
try {
  const resource2 = {
    name: 'yolov8',
    description: 'Container: yolov8m:latest',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "inference-container",
  "registry": "local",
  "imageName": "yolov8m",
  "imageTag": "latest",
  "containerPorts": [
    {
      "containerPort": 3903,
      "hostPort": 3903,
      "protocol": "tcp"
    }
  ],
  "volumeMounts": [
    {
      "hostPath": "yolov8-service_yolov8-cache",
      "containerPath": "/root/.cache",
      "mode": "rw"
    }
  ],
  "envVars": {
    "CUDA_VISIBLE_DEVICES": "0",
    "PATH": "/opt/conda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "NVIDIA_VISIBLE_DEVICES": "all",
    "NVIDIA_DRIVER_CAPABILITIES": "compute,utility",
    "LD_LIBRARY_PATH": "/usr/local/nvidia/lib:/usr/local/nvidia/lib64",
    "PYTORCH_VERSION": "2.1.0"
  },
  "networkMode": "yolov8-service_default",
  "restartPolicy": "unless-stopped",
  "inferenceServer": "triton",
  "modelRepository": "Ultralytics/YOLOv8",
  "gpuDeviceIds": [
    "3"
  ]
},
    runtime: {
      id: 'f65497fa3d8dc753f8c2453fe716a1ec6dc30b809e290816499da63e1f9e5ba4',
      endpoint: 'http://localhost:3903',
      allocatedGPU: ["3"],
      allocatedCPU: null,
      allocatedRAM: null,
      startedAt: new Date('2025-12-03T00:58:23.118080532Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-inference': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing2 = db.resources.findOne({ 'runtime.id': 'f65497fa3d8dc753f8c2453fe716a1ec6dc30b809e290816499da63e1f9e5ba4' });

  if (existing2) {
    db.resources.updateOne(
      { _id: existing2._id },
      { $set: resource2 }
    );
    print('✅ [3/7] Updated: yolov8');
  } else {
    db.resources.insertOne(resource2);
    print('✅ [3/7] Inserted: yolov8');
  }

  print('   Type: inference-container');
  print('   Image: yolov8m:latest');
  print('   Ports: 3903:3903');
  print('   GPUs: 3');
  print('');
  successCount++;
} catch (error) {
  print('❌ [3/7] Error: yolov8: ' + error.message);
  errorCount++;
}


// Container 4/7: whisper-v3
try {
  const resource3 = {
    name: 'whisper-v3',
    description: 'Container: whisper-large-v3:latest',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "inference-container",
  "registry": "local",
  "imageName": "whisper-large-v3",
  "imageTag": "latest",
  "containerPorts": [
    {
      "containerPort": 3902,
      "hostPort": 3902,
      "protocol": "tcp"
    }
  ],
  "volumeMounts": [
    {
      "hostPath": "whisper-v3-service_whisper-cache",
      "containerPath": "/root/.cache",
      "mode": "rw"
    }
  ],
  "envVars": {
    "CUDA_VISIBLE_DEVICES": "0",
    "PATH": "/opt/conda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "NVIDIA_VISIBLE_DEVICES": "all",
    "NVIDIA_DRIVER_CAPABILITIES": "compute,utility",
    "LD_LIBRARY_PATH": "/usr/local/nvidia/lib:/usr/local/nvidia/lib64",
    "PYTORCH_VERSION": "2.1.0",
    "DEBIAN_FRONTEND": "noninteractive",
    "TZ": "Asia/Ho_Chi_Minh"
  },
  "networkMode": "whisper-v3-service_default",
  "restartPolicy": "unless-stopped",
  "inferenceServer": "triton",
  "modelRepository": "openai/whisper-large-v3",
  "gpuDeviceIds": [
    "2"
  ]
},
    runtime: {
      id: 'da554f7e050d63fdcb52cbc88b236b2052fc70d06ca18b29404c4dd47d39e848',
      endpoint: 'http://localhost:3902',
      allocatedGPU: ["2"],
      allocatedCPU: null,
      allocatedRAM: null,
      startedAt: new Date('2025-12-03T00:58:23.122041067Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-inference': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing3 = db.resources.findOne({ 'runtime.id': 'da554f7e050d63fdcb52cbc88b236b2052fc70d06ca18b29404c4dd47d39e848' });

  if (existing3) {
    db.resources.updateOne(
      { _id: existing3._id },
      { $set: resource3 }
    );
    print('✅ [4/7] Updated: whisper-v3');
  } else {
    db.resources.insertOne(resource3);
    print('✅ [4/7] Inserted: whisper-v3');
  }

  print('   Type: inference-container');
  print('   Image: whisper-large-v3:latest');
  print('   Ports: 3902:3902');
  print('   GPUs: 2');
  print('');
  successCount++;
} catch (error) {
  print('❌ [4/7] Error: whisper-v3: ' + error.message);
  errorCount++;
}


// Container 5/7: postgresql-mlflow-backend
try {
  const resource4 = {
    name: 'postgresql-mlflow-backend',
    description: 'Container: postgres:15-alpine',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "application-container",
  "registry": "local",
  "imageName": "postgres",
  "imageTag": "15-alpine",
  "containerPorts": [],
  "volumeMounts": [
    {
      "hostPath": "postgresql_postgresql-mlflow-data",
      "containerPath": "/var/lib/postgresql/data",
      "mode": "rw"
    },
    {
      "hostPath": "/home/xora/infrastructure/postgresql/init-postgres.sql",
      "containerPath": "/docker-entrypoint-initdb.d/init-postgres.sql",
      "mode": "ro"
    }
  ],
  "envVars": {
    "POSTGRES_USER": "postgres",
    "POSTGRES_PASSWORD": "PostgresSecurePass2025!",
    "POSTGRES_DB": "mlflow",
    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "GOSU_VERSION": "1.19",
    "LANG": "en_US.utf8",
    "PG_MAJOR": "15",
    "PG_VERSION": "15.14",
    "PG_SHA256": "06dd75d305cd3870ee62b3932e661c624543eaf9ae2ba37cdec0a4f8edd051d2",
    "DOCKER_PG_LLVM_DEPS": "llvm19-dev \t\tclang19",
    "PGDATA": "/var/lib/postgresql/data"
  },
  "networkMode": "aiops-network",
  "restartPolicy": "unless-stopped",
  "ramLimit": 2.0
},
    runtime: {
      id: 'f5467ecbab98f00129ff609ebfce75893fda7e68a0ad6e8deb9b9b5dd52c68d7',
      endpoint: '',
      allocatedGPU: [],
      allocatedCPU: null,
      allocatedRAM: 2.0,
      startedAt: new Date('2025-12-03T00:58:23.123029127Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-system': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing4 = db.resources.findOne({ 'runtime.id': 'f5467ecbab98f00129ff609ebfce75893fda7e68a0ad6e8deb9b9b5dd52c68d7' });

  if (existing4) {
    db.resources.updateOne(
      { _id: existing4._id },
      { $set: resource4 }
    );
    print('✅ [5/7] Updated: postgresql-mlflow-backend');
  } else {
    db.resources.insertOne(resource4);
    print('✅ [5/7] Inserted: postgresql-mlflow-backend');
  }

  print('   Type: application-container');
  print('   Image: postgres:15-alpine');
  print('   Ports: none');
  print('   GPUs: none');
  print('');
  successCount++;
} catch (error) {
  print('❌ [5/7] Error: postgresql-mlflow-backend: ' + error.message);
  errorCount++;
}


// Container 6/7: mongodb-mlflow-backend
try {
  const resource5 = {
    name: 'mongodb-mlflow-backend',
    description: 'Container: mongo:6.0',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "application-container",
  "registry": "local",
  "imageName": "mongo",
  "imageTag": "6.0",
  "containerPorts": [],
  "volumeMounts": [
    {
      "hostPath": "mongodb_mongodb-mlflow-config",
      "containerPath": "/data/configdb",
      "mode": "rw"
    },
    {
      "hostPath": "mongodb_mongodb-mlflow-data",
      "containerPath": "/data/db",
      "mode": "rw"
    },
    {
      "hostPath": "/home/xora/infrastructure/mongodb/init-mongo.js",
      "containerPath": "/docker-entrypoint-initdb.d/init-mongo.js",
      "mode": "ro"
    }
  ],
  "envVars": {
    "MONGO_INITDB_DATABASE": "mlflow",
    "MONGO_INITDB_ROOT_USERNAME": "admin",
    "MONGO_INITDB_ROOT_PASSWORD": "ChangeThisSecurePassword123!",
    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "GOSU_VERSION": "1.19",
    "JSYAML_VERSION": "3.13.1",
    "JSYAML_CHECKSUM": "662e32319bdd378e91f67578e56a34954b0a2e33aca11d70ab9f4826af24b941",
    "MONGO_PACKAGE": "mongodb-org",
    "MONGO_REPO": "repo.mongodb.org",
    "MONGO_MAJOR": "6.0",
    "MONGO_VERSION": "6.0.26",
    "HOME": "/data/db"
  },
  "networkMode": "aiops-network",
  "restartPolicy": "unless-stopped",
  "ramLimit": 4.0
},
    runtime: {
      id: 'd19ffb0524494bea3a3efe0c8a238f7e529569769727ff56ba97babceaa382f6',
      endpoint: '',
      allocatedGPU: [],
      allocatedCPU: null,
      allocatedRAM: 4.0,
      startedAt: new Date('2025-12-03T00:58:23.121889078Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-system': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing5 = db.resources.findOne({ 'runtime.id': 'd19ffb0524494bea3a3efe0c8a238f7e529569769727ff56ba97babceaa382f6' });

  if (existing5) {
    db.resources.updateOne(
      { _id: existing5._id },
      { $set: resource5 }
    );
    print('✅ [6/7] Updated: mongodb-mlflow-backend');
  } else {
    db.resources.insertOne(resource5);
    print('✅ [6/7] Inserted: mongodb-mlflow-backend');
  }

  print('   Type: application-container');
  print('   Image: mongo:6.0');
  print('   Ports: none');
  print('   GPUs: none');
  print('');
  successCount++;
} catch (error) {
  print('❌ [6/7] Error: mongodb-mlflow-backend: ' + error.message);
  errorCount++;
}


// Container 7/7: minio-storage-single
try {
  const resource6 = {
    name: 'minio-storage-single',
    description: 'Container: minio/minio:latest',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
  "type": "application-container",
  "registry": "local",
  "imageName": "minio/minio",
  "imageTag": "latest",
  "containerPorts": [
    {
      "containerPort": 9000,
      "hostPort": 9000,
      "protocol": "tcp"
    },
    {
      "containerPort": 9001,
      "hostPort": 9001,
      "protocol": "tcp"
    }
  ],
  "volumeMounts": [
    {
      "hostPath": "minio_minio-data",
      "containerPath": "/data",
      "mode": "rw"
    }
  ],
  "envVars": {
    "MINIO_ROOT_USER": "minioadmin",
    "MINIO_ROOT_PASSWORD": "MinIOSecurePass2025!",
    "MINIO_BROWSER": "on",
    "MINIO_PROMETHEUS_AUTH_TYPE": "public",
    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "MINIO_ACCESS_KEY_FILE": "access_key",
    "MINIO_SECRET_KEY_FILE": "secret_key",
    "MINIO_ROOT_USER_FILE": "access_key",
    "MINIO_ROOT_PASSWORD_FILE": "secret_key",
    "MINIO_KMS_SECRET_KEY_FILE": "kms_master_key",
    "MINIO_UPDATE_MINISIGN_PUBKEY": "RWTx5Zr1tiHQLwG9keckT0c45M3AGeHD6IvimQHpyRywVWGbP1aVSGav",
    "MINIO_CONFIG_ENV_FILE": "config.env",
    "MC_CONFIG_DIR": "/tmp/.mc"
  },
  "networkMode": "aiops-network",
  "restartPolicy": "unless-stopped",
  "ramLimit": 4.0
},
    runtime: {
      id: '8480b668bb9e0b4ebffb381136f3f0703135918e79b823d57a9ff81788e89850',
      endpoint: 'http://localhost:9000',
      allocatedGPU: [],
      allocatedCPU: null,
      allocatedRAM: 4.0,
      startedAt: new Date('2025-12-03T00:58:23.119400159Z'),
      stoppedAt: null
    },
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {
      labels: {
        'aio-system': 'true'
      }
    },
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existing6 = db.resources.findOne({ 'runtime.id': '8480b668bb9e0b4ebffb381136f3f0703135918e79b823d57a9ff81788e89850' });

  if (existing6) {
    db.resources.updateOne(
      { _id: existing6._id },
      { $set: resource6 }
    );
    print('✅ [7/7] Updated: minio-storage-single');
  } else {
    db.resources.insertOne(resource6);
    print('✅ [7/7] Inserted: minio-storage-single');
  }

  print('   Type: application-container');
  print('   Image: minio/minio:latest');
  print('   Ports: 9000:9000, 9001:9001');
  print('   GPUs: none');
  print('');
  successCount++;
} catch (error) {
  print('❌ [7/7] Error: minio-storage-single: ' + error.message);
  errorCount++;
}


print('========================================');
print('Sync Summary');
print('========================================');
print('✅ Success: ' + successCount);
print('❌ Errors: ' + errorCount);
print('📊 Total: 7');
print('');

// Verification
const totalResources = db.resources.countDocuments({{ 'owner.orgId': ORG_ID }});
print('Total resources: ' + totalResources);

const byType = db.resources.aggregate([
  {{ $match: {{ 'owner.orgId': ORG_ID }} }},
  {{ $group: {{ _id: '$resourceType', count: {{ $sum: 1 }} }} }}
]).toArray();

print('');
print('By Type:');
byType.forEach(item => {{
  print('  - ' + item._id + ': ' + item.count);
}});

const withInference = db.resources.countDocuments({{ 'owner.orgId': ORG_ID, 'metadata.labels.aio-inference': 'true' }});
const withSystem = db.resources.countDocuments({{ 'owner.orgId': ORG_ID, 'metadata.labels.aio-system': 'true' }});
print('');
print('By Labels:');
print('  - aio-inference: ' + withInference);
print('  - aio-system: ' + withSystem);

print('');
print('========================================');
print('✅ Sync Complete!');
print('========================================');

