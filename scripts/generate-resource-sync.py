#!/usr/bin/env python3
"""
Generate MongoDB script to sync Docker containers to resources
"""

import json
import sys

# Read JSON file
with open('docs/aiwm/docker_containers_details.json', 'r') as f:
    containers = json.load(f)

# Configuration
ORG_ID = "692ff5fa3371dad36b287ec5"
USER_ID = "692ff5fa3371dad36b287ec4"
NODE_ID = "6931711bd436a16167c4c5f1"

# Container classification
inference_containers = ['qwen25-7b', 'vbd-llama2', 'yolov8', 'whisper-v3']
system_containers = ['postgresql-mlflow-backend', 'mongodb-mlflow-backend', 'minio-storage-single']

# Model mapping
model_mapping = {
    'qwen25-7b': 'Qwen/Qwen2.5-7B',
    'vbd-llama2': 'LR-AI-Labs/vbd-llama2-7B-50b-chat',
    'yolov8': 'Ultralytics/YOLOv8',
    'whisper-v3': 'openai/whisper-large-v3'
}

print("""/**
 * Generated MongoDB script to sync Docker containers to resources
 * Auto-generated from docker_containers_details.json
 */

const ORG_ID = ObjectId('{}');
const USER_ID = ObjectId('{}');
const NODE_ID = ObjectId('{}');

print('========================================');
print('Syncing Docker Containers to Resources');
print('========================================');
print('Total Containers: {}');
print('');

let successCount = 0;
let errorCount = 0;

""".format(ORG_ID, USER_ID, NODE_ID, len(containers)))

for idx, container in enumerate(containers):
    container_name = container['Name'][1:]  # Remove leading '/'
    container_id = container['Id']
    config_obj = container.get('Config', {})
    host_config = container.get('HostConfig', {})
    state = container.get('State', {})

    # Determine type and labels
    is_inference = container_name in inference_containers
    resource_type = 'inference-container' if is_inference else 'application-container'
    label_key = 'aio-inference' if is_inference else 'aio-system'

    # Extract image info
    image_full = config_obj.get('Image', 'unknown:latest')
    image_parts = image_full.split(':')
    image_name = image_parts[0]
    image_tag = image_parts[1] if len(image_parts) > 1 else 'latest'

    # Extract ports
    port_bindings = host_config.get('PortBindings', {})
    container_ports = []
    for port_spec, bindings in port_bindings.items():
        port_num, protocol = port_spec.split('/')
        for binding in bindings:
            host_port = binding.get('HostPort', port_num)
            container_ports.append({
                'containerPort': int(port_num),
                'hostPort': int(host_port),
                'protocol': protocol
            })

    # Extract volumes
    binds = host_config.get('Binds', [])
    volume_mounts = []
    for bind in binds:
        parts = bind.split(':')
        volume_mounts.append({
            'hostPath': parts[0],
            'containerPath': parts[1] if len(parts) > 1 else parts[0],
            'mode': parts[2] if len(parts) > 2 else 'rw'
        })

    # Extract env vars
    env_array = config_obj.get('Env', [])
    env_vars = {}
    for env_str in env_array:
        parts = env_str.split('=', 1)
        if len(parts) == 2:
            env_vars[parts[0]] = parts[1]

    # Extract GPU info
    device_requests = host_config.get('DeviceRequests') or []
    gpu_device_ids = []
    for req in device_requests:
        if req and 'DeviceIDs' in req:
            gpu_device_ids.extend(req.get('DeviceIDs', []))

    # Extract resource limits
    cpu_quota = host_config.get('CpuQuota', 0)
    cpu_period = host_config.get('CpuPeriod', 100000)
    memory_limit = host_config.get('Memory', 0)

    cpu_cores = round(cpu_quota / cpu_period, 2) if cpu_quota > 0 else None
    ram_gb = round(memory_limit / (1024**3), 2) if memory_limit > 0 else None

    # Build endpoint
    endpoint = ''
    if container_ports:
        endpoint = f"http://localhost:{container_ports[0]['hostPort']}"

    # Started time
    started_at = state.get('StartedAt', '')

    # Build config
    config = {
        'type': resource_type,
        'registry': 'local',
        'imageName': image_name,
        'imageTag': image_tag,
        'containerPorts': container_ports,
        'volumeMounts': volume_mounts,
        'envVars': env_vars,
        'networkMode': host_config.get('NetworkMode', 'bridge'),
        'restartPolicy': host_config.get('RestartPolicy', {}).get('Name', 'unless-stopped')
    }

    if is_inference:
        config['inferenceServer'] = 'vllm' if 'vllm' in image_name else 'triton'
        if container_name in model_mapping:
            config['modelRepository'] = model_mapping[container_name]

    if gpu_device_ids:
        config['gpuDeviceIds'] = gpu_device_ids

    if cpu_cores:
        config['cpuLimit'] = cpu_cores

    if ram_gb:
        config['ramLimit'] = ram_gb

    # Generate MongoDB commands
    print(f"""
// Container {idx + 1}/{len(containers)}: {container_name}
try {{
  const resource{idx} = {{
    name: '{container_name}',
    description: 'Container: {image_name}:{image_tag}',
    resourceType: '{resource_type}',
    nodeId: NODE_ID,
    status: 'running',
    config: {json.dumps(config, indent=2)},
    runtime: {{
      id: '{container_id}',
      endpoint: '{endpoint}',
      allocatedGPU: {json.dumps(gpu_device_ids)},
      allocatedCPU: {cpu_cores if cpu_cores else 'null'},
      allocatedRAM: {ram_gb if ram_gb else 'null'},
      startedAt: new Date('{started_at}'),
      stoppedAt: null
    }},
    lastHealthCheck: new Date(),
    errorMessage: null,
    metadata: {{
      labels: {{
        '{label_key}': 'true'
      }}
    }},
    owner: {{
      userId: USER_ID,
      orgId: ORG_ID
    }},
    createdBy: USER_ID,
    updatedBy: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }};

  const existing{idx} = db.resources.findOne({{ 'runtime.id': '{container_id}' }});

  if (existing{idx}) {{
    db.resources.updateOne(
      {{ _id: existing{idx}._id }},
      {{ $set: resource{idx} }}
    );
    print('✅ [{idx + 1}/{len(containers)}] Updated: {container_name}');
  }} else {{
    db.resources.insertOne(resource{idx});
    print('✅ [{idx + 1}/{len(containers)}] Inserted: {container_name}');
  }}

  print('   Type: {resource_type}');
  print('   Image: {image_name}:{image_tag}');
  print('   Ports: {", ".join([f"{p['containerPort']}:{p['hostPort']}" for p in container_ports]) if container_ports else "none"}');
  print('   GPUs: {", ".join(gpu_device_ids) if gpu_device_ids else "none"}');
  print('');
  successCount++;
}} catch (error) {{
  print('❌ [{idx + 1}/{len(containers)}] Error: {container_name}: ' + error.message);
  errorCount++;
}}
""")

print("""
print('========================================');
print('Sync Summary');
print('========================================');
print('✅ Success: ' + successCount);
print('❌ Errors: ' + errorCount);
print('📊 Total: """ + str(len(containers)) + """');
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
""")
