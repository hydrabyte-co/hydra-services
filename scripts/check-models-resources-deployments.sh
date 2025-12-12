#!/bin/bash

# Quick script to check Models, Resources, and Deployments
# Usage: ./scripts/check-models-resources-deployments.sh

MONGO_URI="mongodb://172.16.3.20:27017/core_aiwm"

echo "========================================"
echo "Models, Resources & Deployments Status"
echo "========================================"
echo ""

mongosh "$MONGO_URI" --quiet --eval '
print("All Active Models with Resources & Deployments:");
print("");

const allModels = db.models.find({isDeleted: false, status: "active"}).toArray();

allModels.forEach((model, idx) => {
  print("["+ (idx+1) + "] 🤖 MODEL: " + model.name);
  print("    ID: " + model._id);
  print("    Type: " + model.type);
  print("");

  // Find resources
  const resources = db.resources.find({
    modelId: model._id.toString(),
    isDeleted: false
  }).toArray();

  if (resources.length > 0) {
    resources.forEach((res) => {
      print("    📦 RESOURCE: " + res.name);
      print("       ID: " + res._id);
      print("       Status: " + res.status);
      print("       Node: " + res.nodeId);
      print("       Config: GPU=" + res.config.gpu + ", Memory=" + res.config.memory);
      print("");
    });
  } else {
    print("    ⚠️  No resources found");
    print("");
  }

  // Find deployments
  const deployments = db.deployments.find({
    modelId: model._id.toString(),
    isDeleted: false
  }).toArray();

  if (deployments.length > 0) {
    deployments.forEach((dep) => {
      print("    🚀 DEPLOYMENT: " + dep.name);
      print("       ID: " + dep._id);
      print("       Status: " + dep.status);
      print("       ResourceId: " + dep.resourceId);
      if (dep.endpoint) {
        print("       Endpoint: " + dep.endpoint);
      }
      print("");
    });
  } else {
    print("    ⚠️  No deployments found");
    print("");
  }

  print("    " + "─".repeat(60));
  print("");
});

print("========================================");
print("Summary Statistics");
print("========================================");
const totalModels = db.models.countDocuments({isDeleted: false, status: "active"});
const totalResources = db.resources.countDocuments({isDeleted: false});
const totalDeployments = db.deployments.countDocuments({isDeleted: false});

print("Total Active Models: " + totalModels);
print("Total Resources: " + totalResources);
print("Total Deployments: " + totalDeployments);
print("");

// Check for models without resources or deployments
const modelsWithoutResources = [];
const modelsWithoutDeployments = [];

allModels.forEach((model) => {
  const resourceCount = db.resources.countDocuments({
    modelId: model._id.toString(),
    isDeleted: false
  });

  const deploymentCount = db.deployments.countDocuments({
    modelId: model._id.toString(),
    isDeleted: false
  });

  if (resourceCount === 0) {
    modelsWithoutResources.push(model.name);
  }

  if (deploymentCount === 0) {
    modelsWithoutDeployments.push(model.name);
  }
});

if (modelsWithoutResources.length > 0) {
  print("⚠️  Models without resources:");
  modelsWithoutResources.forEach(name => print("   - " + name));
  print("");
}

if (modelsWithoutDeployments.length > 0) {
  print("⚠️  Models without deployments:");
  modelsWithoutDeployments.forEach(name => print("   - " + name));
  print("");
}

if (modelsWithoutResources.length === 0 && modelsWithoutDeployments.length === 0) {
  print("✅ All models have resources and deployments!");
}
'
