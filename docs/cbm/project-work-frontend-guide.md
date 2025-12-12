# Project & Work Frontend Integration Guide

## Overview

This guide provides comprehensive instructions for frontend developers to integrate with the Project and Work APIs in the CBM (Core Business Management) service. It covers data models, API calls, state management patterns, React component examples, and best practices.

**Target Audience:** Frontend developers using React/TypeScript
**Base URL:** `http://localhost:3001`
**Service:** CBM (Core Business Management)

## Table of Contents

- [Getting Started](#getting-started)
- [TypeScript Types](#typescript-types)
- [API Client Setup](#api-client-setup)
- [React Hooks](#react-hooks)
- [Component Examples](#component-examples)
- [State Management](#state-management)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Getting Started

### Prerequisites

- React 18+
- TypeScript 4.9+
- Axios or Fetch API for HTTP requests
- JWT authentication token from IAM service

### Quick Start

```bash
# Install dependencies
npm install axios date-fns
npm install -D @types/node
```

---

## TypeScript Types

### Project Types

```typescript
// types/project.ts

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  members: string[];
  startDate?: string; // ISO 8601 date string
  dueDate?: string;
  tags: string[];
  documents: string[];
  status: ProjectStatus;
  owner: {
    userId: string;
    orgId: string;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  members?: string[];
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  documents?: string[];
  status?: ProjectStatus;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  members?: string[];
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  documents?: string[];
  status?: ProjectStatus;
}

export interface ProjectListResponse {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    total: number;
    byStatus: Record<ProjectStatus, number>;
  };
}
```

### Work Types

```typescript
// types/work.ts

export type WorkType = 'epic' | 'task' | 'subtask';

export type WorkStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'cancelled'
  | 'review'
  | 'done';

export interface ReporterAssignee {
  type: 'user' | 'agent';
  id: string;
}

export interface Work {
  _id: string;
  title: string;
  summary?: string;
  description?: string;
  type: WorkType;
  projectId?: string;
  reporter: ReporterAssignee;
  assignee?: ReporterAssignee;
  dueDate?: string;
  startAt?: string;
  status: WorkStatus;
  blockedBy: string[];
  parentId?: string;
  documents: string[];
  owner: {
    userId: string;
    orgId: string;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateWorkDto {
  title: string;
  summary?: string;
  description?: string;
  type: WorkType;
  projectId?: string;
  reporter: ReporterAssignee;
  assignee?: ReporterAssignee;
  dueDate?: string;
  startAt?: string;
  status?: WorkStatus;
  blockedBy?: string[];
  parentId?: string;
  documents?: string[];
}

export interface UpdateWorkDto {
  title?: string;
  summary?: string;
  description?: string;
  type?: WorkType;
  projectId?: string;
  reporter?: ReporterAssignee;
  assignee?: ReporterAssignee;
  dueDate?: string;
  startAt?: string;
  status?: WorkStatus;
  blockedBy?: string[];
  parentId?: string;
  documents?: string[];
}

export interface WorkListResponse {
  data: Work[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    total: number;
    byStatus: Record<WorkStatus, number>;
    byType: Record<WorkType, number>;
  };
}
```

---

## API Client Setup

### Axios Configuration

```typescript
// api/client.ts

import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_CBM_API_URL || 'http://localhost:3001';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Project API Client

```typescript
// api/projects.ts

import apiClient from './client';
import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectListResponse
} from '../types/project';

export const projectsApi = {
  // List projects
  list: async (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    'filter[status]'?: string;
    'filter[tags]'?: string;
  }): Promise<ProjectListResponse> => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  // Get project by ID
  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  // Create project
  create: async (data: CreateProjectDto): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  // Update project
  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data;
  },

  // Delete project
  delete: async (id: string): Promise<Project> => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  // Action: Activate
  activate: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/activate`);
    return response.data;
  },

  // Action: Hold
  hold: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/hold`);
    return response.data;
  },

  // Action: Resume
  resume: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/resume`);
    return response.data;
  },

  // Action: Complete
  complete: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/complete`);
    return response.data;
  },

  // Action: Archive
  archive: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/archive`);
    return response.data;
  },
};
```

### Work API Client

```typescript
// api/works.ts

import apiClient from './client';
import {
  Work,
  CreateWorkDto,
  UpdateWorkDto,
  WorkListResponse
} from '../types/work';

export const worksApi = {
  // List works
  list: async (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    'filter[status]'?: string;
    'filter[type]'?: string;
    'filter[projectId]'?: string;
    'filter[assignee.id]'?: string;
    'filter[parentId]'?: string;
  }): Promise<WorkListResponse> => {
    const response = await apiClient.get('/works', { params });
    return response.data;
  },

  // Get work by ID
  get: async (id: string): Promise<Work> => {
    const response = await apiClient.get(`/works/${id}`);
    return response.data;
  },

  // Create work
  create: async (data: CreateWorkDto): Promise<Work> => {
    const response = await apiClient.post('/works', data);
    return response.data;
  },

  // Update work
  update: async (id: string, data: UpdateWorkDto): Promise<Work> => {
    const response = await apiClient.patch(`/works/${id}`, data);
    return response.data;
  },

  // Delete work
  delete: async (id: string): Promise<Work> => {
    const response = await apiClient.delete(`/works/${id}`);
    return response.data;
  },

  // Action: Start
  start: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/start`);
    return response.data;
  },

  // Action: Block
  block: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/block`);
    return response.data;
  },

  // Action: Unblock
  unblock: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/unblock`);
    return response.data;
  },

  // Action: Request Review
  requestReview: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/request-review`);
    return response.data;
  },

  // Action: Complete
  complete: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/complete`);
    return response.data;
  },

  // Action: Reopen
  reopen: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/reopen`);
    return response.data;
  },

  // Action: Cancel
  cancel: async (id: string): Promise<Work> => {
    const response = await apiClient.post(`/works/${id}/cancel`);
    return response.data;
  },
};
```

---

## React Hooks

### useProjects Hook

```typescript
// hooks/useProjects.ts

import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';
import { Project, ProjectListResponse } from '../types/project';

export function useProjects(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const [data, setData] = useState<ProjectListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await projectsApi.list({
        page: params?.page || 1,
        limit: params?.limit || 10,
        ...(params?.status && { 'filter[status]': params.status }),
      });
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [params?.page, params?.limit, params?.status]);

  return { data, loading, error, refetch: fetchProjects };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProject = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.get(id);
      setProject(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  return { project, loading, error, refetch: fetchProject };
}
```

### useWorks Hook

```typescript
// hooks/useWorks.ts

import { useState, useEffect } from 'react';
import { worksApi } from '../api/works';
import { Work, WorkListResponse } from '../types/work';

export function useWorks(params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  projectId?: string;
  parentId?: string;
}) {
  const [data, setData] = useState<WorkListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await worksApi.list({
        page: params?.page || 1,
        limit: params?.limit || 10,
        ...(params?.status && { 'filter[status]': params.status }),
        ...(params?.type && { 'filter[type]': params.type }),
        ...(params?.projectId && { 'filter[projectId]': params.projectId }),
        ...(params?.parentId && { 'filter[parentId]': params.parentId }),
      });
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [
    params?.page,
    params?.limit,
    params?.status,
    params?.type,
    params?.projectId,
    params?.parentId,
  ]);

  return { data, loading, error, refetch: fetchWorks };
}

export function useWork(id: string) {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWork = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await worksApi.get(id);
      setWork(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWork();
  }, [id]);

  return { work, loading, error, refetch: fetchWork };
}
```

---

## Component Examples

### ProjectList Component

```typescript
// components/ProjectList.tsx

import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { ProjectStatus } from '../types/project';
import { format } from 'date-fns';

export function ProjectList() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');

  const { data, loading, error, refetch } = useProjects({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="project-list">
      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <h3>Statistics</h3>
        <div className="stats-grid">
          {Object.entries(data.statistics.byStatus).map(([status, count]) => (
            <div key={status} className="stat-item">
              <span className="stat-label">{status}:</span>
              <span className="stat-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Project List */}
      <div className="projects">
        {data.data.map((project) => (
          <div key={project._id} className="project-card">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <div className="project-meta">
              <span className={`status status-${project.status}`}>
                {project.status}
              </span>
              <span className="date">
                Created: {format(new Date(project.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="project-tags">
              {project.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {data.pagination.totalPages}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page === data.pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### ProjectActions Component

```typescript
// components/ProjectActions.tsx

import React, { useState } from 'react';
import { projectsApi } from '../api/projects';
import { Project, ProjectStatus } from '../types/project';

interface ProjectActionsProps {
  project: Project;
  onSuccess: () => void;
}

export function ProjectActions({ project, onSuccess }: ProjectActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (
    actionFn: (id: string) => Promise<Project>,
    actionName: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      await actionFn(project._id);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${actionName}`);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableActions = (status: ProjectStatus) => {
    const actions: { label: string; fn: () => Promise<void> }[] = [];

    if (status === 'draft') {
      actions.push({
        label: 'Activate',
        fn: () => handleAction(projectsApi.activate, 'activate'),
      });
    }

    if (status === 'active') {
      actions.push(
        {
          label: 'Hold',
          fn: () => handleAction(projectsApi.hold, 'hold'),
        },
        {
          label: 'Complete',
          fn: () => handleAction(projectsApi.complete, 'complete'),
        }
      );
    }

    if (status === 'on_hold') {
      actions.push({
        label: 'Resume',
        fn: () => handleAction(projectsApi.resume, 'resume'),
      });
    }

    if (status === 'completed') {
      actions.push({
        label: 'Archive',
        fn: () => handleAction(projectsApi.archive, 'archive'),
      });
    }

    return actions;
  };

  const availableActions = getAvailableActions(project.status);

  if (availableActions.length === 0) {
    return <div>No actions available</div>;
  }

  return (
    <div className="project-actions">
      {error && <div className="error">{error}</div>}
      <div className="actions-buttons">
        {availableActions.map((action) => (
          <button
            key={action.label}
            onClick={action.fn}
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### WorkKanban Component

```typescript
// components/WorkKanban.tsx

import React from 'react';
import { useWorks } from '../hooks/useWorks';
import { WorkStatus } from '../types/work';
import { worksApi } from '../api/works';

interface WorkKanbanProps {
  projectId?: string;
}

export function WorkKanban({ projectId }: WorkKanbanProps) {
  const { data, loading, error, refetch } = useWorks({ projectId });

  const columns: WorkStatus[] = [
    'backlog',
    'todo',
    'in_progress',
    'blocked',
    'review',
    'done',
  ];

  const handleDragStart = (e: React.DragEvent, workId: string) => {
    e.dataTransfer.setData('workId', workId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: WorkStatus) => {
    e.preventDefault();
    const workId = e.dataTransfer.getData('workId');

    try {
      // Call appropriate action endpoint based on status transition
      // This is simplified - production code should validate transitions
      await worksApi.update(workId, { status: targetStatus });
      refetch();
    } catch (error) {
      console.error('Failed to update work status:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  const worksByStatus = data.data.reduce((acc, work) => {
    if (!acc[work.status]) acc[work.status] = [];
    acc[work.status].push(work);
    return acc;
  }, {} as Record<WorkStatus, typeof data.data>);

  return (
    <div className="kanban-board">
      {columns.map((status) => (
        <div
          key={status}
          className="kanban-column"
          onDrop={(e) => handleDrop(e, status)}
          onDragOver={handleDragOver}
        >
          <div className="column-header">
            <h3>{status.replace('_', ' ')}</h3>
            <span className="count">
              {data.statistics.byStatus[status] || 0}
            </span>
          </div>
          <div className="column-content">
            {(worksByStatus[status] || []).map((work) => (
              <div
                key={work._id}
                className="work-card"
                draggable
                onDragStart={(e) => handleDragStart(e, work._id)}
              >
                <div className="work-type">{work.type}</div>
                <h4>{work.title}</h4>
                {work.summary && <p>{work.summary}</p>}
                {work.assignee && (
                  <div className="assignee">
                    Assigned to: {work.assignee.type} {work.assignee.id}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### CreateWorkForm Component

```typescript
// components/CreateWorkForm.tsx

import React, { useState } from 'react';
import { worksApi } from '../api/works';
import { CreateWorkDto, WorkType } from '../types/work';

interface CreateWorkFormProps {
  projectId?: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateWorkForm({
  projectId,
  parentId,
  onSuccess,
  onCancel,
}: CreateWorkFormProps) {
  const [formData, setFormData] = useState<CreateWorkDto>({
    title: '',
    summary: '',
    description: '',
    type: 'task',
    projectId,
    parentId,
    reporter: {
      type: 'user',
      id: '', // Should be populated from current user context
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await worksApi.create(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create work');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-work-form">
      <h2>Create Work</h2>

      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label>Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          maxLength={200}
        />
      </div>

      <div className="form-group">
        <label>Type *</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as WorkType })}
          required
        >
          <option value="epic">Epic</option>
          <option value="task">Task</option>
          <option value="subtask">Subtask</option>
        </select>
      </div>

      <div className="form-group">
        <label>Summary</label>
        <input
          type="text"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          maxLength={500}
        />
      </div>

      <div className="form-group">
        <label>Description (Markdown)</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={10}
          maxLength={10000}
        />
      </div>

      <div className="form-group">
        <label>Assignee</label>
        <div className="assignee-selector">
          <select
            value={formData.assignee?.type || ''}
            onChange={(e) => setFormData({
              ...formData,
              assignee: e.target.value ? {
                type: e.target.value as 'user' | 'agent',
                id: formData.assignee?.id || '',
              } : undefined,
            })}
          >
            <option value="">Not assigned</option>
            <option value="user">User</option>
            <option value="agent">Agent</option>
          </select>
          {formData.assignee && (
            <input
              type="text"
              placeholder="Assignee ID"
              value={formData.assignee.id}
              onChange={(e) => setFormData({
                ...formData,
                assignee: {
                  ...formData.assignee!,
                  id: e.target.value,
                },
              })}
            />
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Work'}
        </button>
      </div>
    </form>
  );
}
```

---

## State Management

### React Context Example

```typescript
// context/ProjectContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '../types/project';
import { projectsApi } from '../api/projects';

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  activateProject: (id: string) => Promise<void>;
  completeProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const activateProject = async (id: string) => {
    const updated = await projectsApi.activate(id);
    if (currentProject?._id === id) {
      setCurrentProject(updated);
    }
  };

  const completeProject = async (id: string) => {
    const updated = await projectsApi.complete(id);
    if (currentProject?._id === id) {
      setCurrentProject(updated);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        activateProject,
        completeProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
}
```

---

## Best Practices

### 1. Status Badge Component

```typescript
// components/StatusBadge.tsx

import React from 'react';
import { ProjectStatus, WorkStatus } from '../types';

const statusColors: Record<ProjectStatus | WorkStatus, string> = {
  // Project statuses
  draft: '#gray',
  active: '#green',
  on_hold: '#yellow',
  completed: '#blue',
  archived: '#purple',

  // Work statuses
  backlog: '#gray',
  todo: '#blue',
  in_progress: '#yellow',
  blocked: '#red',
  cancelled: '#red',
  review: '#orange',
  done: '#green',
};

export function StatusBadge({ status }: { status: ProjectStatus | WorkStatus }) {
  return (
    <span
      className="status-badge"
      style={{ backgroundColor: statusColors[status] }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
```

### 2. Error Handling Utility

```typescript
// utils/errorHandler.ts

import { AxiosError } from 'axios';

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message || error.message;
  }
  return 'An unexpected error occurred';
}

// Usage in components
try {
  await projectsApi.activate(id);
} catch (error) {
  setError(handleApiError(error));
}
```

### 3. Date Formatting

```typescript
// utils/dateFormat.ts

import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMM dd, yyyy');
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
}

export function formatRelative(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}
```

### 4. Validation Helpers

```typescript
// utils/validation.ts

import { CreateProjectDto, CreateWorkDto } from '../types';

export function validateProjectForm(data: CreateProjectDto): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Project name is required');
  }

  if (data.name && data.name.length > 200) {
    errors.push('Project name must be 200 characters or less');
  }

  if (data.description && data.description.length > 2000) {
    errors.push('Description must be 2000 characters or less');
  }

  if (data.startDate && data.dueDate) {
    if (new Date(data.startDate) > new Date(data.dueDate)) {
      errors.push('Start date must be before due date');
    }
  }

  return errors;
}

export function validateWorkForm(data: CreateWorkDto): string[] {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Work title is required');
  }

  if (data.title && data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.reporter || !data.reporter.id) {
    errors.push('Reporter is required');
  }

  if (data.type === 'subtask' && !data.parentId) {
    errors.push('Subtasks must have a parent work');
  }

  return errors;
}
```

---

## Testing

### Unit Test Example (Jest + React Testing Library)

```typescript
// __tests__/ProjectList.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { ProjectList } from '../components/ProjectList';
import { projectsApi } from '../api/projects';

jest.mock('../api/projects');

describe('ProjectList', () => {
  it('renders projects correctly', async () => {
    const mockData = {
      data: [
        {
          _id: '1',
          name: 'Test Project',
          status: 'active',
          tags: ['test'],
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      statistics: { total: 1, byStatus: { active: 1 } },
    };

    (projectsApi.list as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
});
```

---

## Summary

This guide provides:

- ✅ Complete TypeScript types for type safety
- ✅ API client with interceptors for authentication
- ✅ Reusable React hooks for data fetching
- ✅ Component examples covering common use cases
- ✅ State management patterns with Context API
- ✅ Best practices for error handling and validation
- ✅ Testing examples

For complete API reference, see:
- [Project API Documentation](./project-api.md)
- [Work API Documentation](./work-api.md)
