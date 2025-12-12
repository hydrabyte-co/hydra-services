#!/bin/bash

# Quick script to check VTV data in MongoDB
# Usage: ./scripts/check-vtv-data.sh

MONGO_URI="mongodb://172.16.3.20:27017/core_aiwm"

echo "========================================"
echo "Checking VTV Data"
echo "========================================"
echo ""

mongosh "$MONGO_URI" --quiet --eval "
const ORG_ID = '691eba0851 7f917943ae1f9d';

print('📊 Statistics:');
print('');

const agentCount = db.agents.countDocuments({tags: 'vtv', isDeleted: false});
const guardrailCount = db.guardrails.countDocuments({tags: 'vtv', isDeleted: false});
const instructionCount = db.instructions.countDocuments({tags: 'vtv', isDeleted: false});
const nodeCount = db.nodes.countDocuments({tags: 'vtv', isDeleted: false});

print('VTV Agents: ' + agentCount);
print('VTV Guardrails: ' + guardrailCount);
print('VTV Instructions: ' + instructionCount);
print('VTV Nodes: ' + nodeCount);
print('');

print('========================================');
print('🤖 VTV Agents:');
print('========================================');
print('');

const agents = db.agents.find({tags: 'vtv', isDeleted: false}).toArray();
agents.forEach((agent, i) => {
  const instruction = db.instructions.findOne({_id: ObjectId(agent.instructionId)});
  const guardrail = db.guardrails.findOne({_id: ObjectId(agent.guardrailId)});

  print(\`[\${i+1}] \${agent.name}\`);
  print(\`    Status: \${agent.status}\`);
  print(\`    Instruction: \${instruction ? instruction.name : 'N/A'}\`);
  print(\`    Guardrail: \${guardrail ? guardrail.name : 'N/A'}\`);
  print(\`    Tags: \${agent.tags.join(', ')}\`);
  print('');
});

print('========================================');
print('🛡️  VTV Guardrails:');
print('========================================');
print('');

const guardrails = db.guardrails.find({tags: 'vtv', isDeleted: false}).toArray();
guardrails.forEach((gr, i) => {
  print(\`[\${i+1}] \${gr.name}\`);
  print(\`    Status: \${gr.status} | Enabled: \${gr.enabled}\`);
  print(\`    Keywords: \${gr.blockedKeywords.length} | Topics: \${gr.blockedTopics.length}\`);
  print(\`    Tags: \${gr.tags.join(', ')}\`);
  print('');
});

print('========================================');
print('📝 VTV Instructions:');
print('========================================');
print('');

const instructions = db.instructions.find({tags: 'vtv', isDeleted: false}).toArray();
instructions.forEach((instr, i) => {
  print(\`[\${i+1}] \${instr.name}\`);
  print(\`    Status: \${instr.status}\`);
  print(\`    Description: \${instr.description.substring(0, 60)}...\`);
  print('');
});
"
