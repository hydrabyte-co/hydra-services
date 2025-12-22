# License Management API Documentation

## Overview

License API cho phép **universe.owner** quản lý licenses của các organization cho từng service trong hệ thống. Mỗi license xác định mức độ truy cập (disabled/limited/full) của một organization vào một service cụ thể.

**Base URL**: `http://localhost:3000` (development)

**Authentication**: Tất cả endpoints yêu cầu JWT token với role `universe.owner`

```bash
Authorization: Bearer <JWT_TOKEN>
```

---

## License Types

| Type | Value | Ý nghĩa |
|------|-------|---------|
| DISABLED | `disabled` | Organization không thể truy cập service |
| LIMITED | `limited` | Truy cập bị giới hạn (tùy thuộc vào từng endpoint) |
| FULL | `full` | Truy cập đầy đủ tất cả tính năng |

## Service Names

| Service | Value | Mô tả |
|---------|-------|-------|
| IAM | `iam` | Identity & Access Management |
| CBM | `cbm` | Core Business Management |
| AIWM | `aiwm` | AI Workload Manager |
| NOTI | `noti` | Notification Service |

---

## 1. Tạo License Đơn

### `POST /licenses`

Tạo một license cho một cặp organization-service.

#### Request Body

```json
{
  "orgId": "507f1f77bcf86cd799439011",
  "serviceName": "aiwm",
  "type": "full",
  "quotaLimit": 1000,
  "expiresAt": "2025-12-31T23:59:59Z",
  "notes": "Trial period - 30 days"
}
```

#### Parameters

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `orgId` | string | ✅ | ID của organization (MongoDB ObjectId format). **Load từ GET /organizations** |
| `serviceName` | string | ✅ | Tên service: `iam`, `cbm`, `aiwm`, `noti` |
| `type` | string | ✅ | Loại license: `disabled`, `limited`, `full` |
| `quotaLimit` | number | ❌ | Giới hạn quota (null = unlimited). Chưa enforce ở Phase 1 |
| `expiresAt` | string | ❌ | Ngày hết hạn (ISO 8601). Chưa enforce ở Phase 1 |
| `notes` | string | ❌ | Ghi chú nội bộ về license |

#### Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "orgId": "507f1f77bcf86cd799439011",
  "serviceName": "aiwm",
  "type": "full",
  "quotaLimit": 1000,
  "quotaUsed": 0,
  "expiresAt": "2025-12-31T23:59:59Z",
  "notes": "Trial period - 30 days",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "createdBy": "68dcf365f6a92c0d4911b619",
  "updatedBy": "68dcf365f6a92c0d4911b619"
}
```

#### Error Responses

**400 Bad Request** - Validation errors
```json
{
  "statusCode": 400,
  "message": [
    "orgId must be a valid MongoDB ObjectId",
    "serviceName must be one of: iam, cbm, aiwm, noti",
    "type must be one of: disabled, limited, full"
  ],
  "error": "Bad Request"
}
```

**404 Not Found** - Organization không tồn tại
```json
{
  "statusCode": 404,
  "message": "Organization with ID 507f1f77bcf86cd799439011 not found or has been deleted",
  "error": "Not Found"
}
```

**409 Conflict** - License đã tồn tại
```json
{
  "statusCode": 409,
  "message": "License already exists for organization 507f1f77bcf86cd799439011 and service aiwm",
  "error": "Conflict"
}
```

---

## 2. Tạo Default Licenses Hàng Loạt

### `POST /licenses/default`

Tạo default licenses cho tất cả services của một organization.

**Default configuration:**
- IAM: FULL (bắt buộc cho authentication)
- CBM: DISABLED
- AIWM: DISABLED
- NOTI: DISABLED

#### Request Body

```json
{
  "orgId": "507f1f77bcf86cd799439011",
  "notes": "Default licenses for new organization"
}
```

#### Parameters

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `orgId` | string | ✅ | ID của organization |
| `notes` | string | ❌ | Ghi chú chung cho tất cả licenses |

#### Response (201 Created)

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "orgId": "507f1f77bcf86cd799439011",
    "serviceName": "iam",
    "type": "full",
    "notes": "Default licenses for new organization"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "orgId": "507f1f77bcf86cd799439011",
    "serviceName": "cbm",
    "type": "disabled",
    "notes": "Default licenses for new organization"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "orgId": "507f1f77bcf86cd799439011",
    "serviceName": "aiwm",
    "type": "disabled",
    "notes": "Default licenses for new organization"
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "orgId": "507f1f77bcf86cd799439011",
    "serviceName": "noti",
    "type": "disabled",
    "notes": "Default licenses for new organization"
  }
]
```

---

## 3. Lấy Danh Sách Licenses

### `GET /licenses`

Lấy danh sách licenses với phân trang và filter.

#### Query Parameters

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `page` | number | ❌ | Trang hiện tại (default: 1) |
| `limit` | number | ❌ | Số items per page (default: 10) |
| `orgId` | string | ❌ | Filter theo organization ID |
| `serviceName` | string | ❌ | Filter theo service: `iam`, `cbm`, `aiwm`, `noti` |
| `sort` | string | ❌ | Sắp xếp: `createdAt`, `-createdAt`, `type`, etc. |

#### Example Requests

```bash
# Lấy tất cả licenses (page 1)
GET /licenses?page=1&limit=10

# Filter theo organization
GET /licenses?orgId=507f1f77bcf86cd799439011

# Filter theo service
GET /licenses?serviceName=aiwm

# Kết hợp filters
GET /licenses?orgId=507f1f77bcf86cd799439011&serviceName=aiwm

# Sắp xếp theo ngày tạo mới nhất
GET /licenses?sort=-createdAt
```

#### Response (200 OK)

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "orgId": "507f1f77bcf86cd799439011",
      "serviceName": "aiwm",
      "type": "full",
      "quotaLimit": 1000,
      "quotaUsed": 250,
      "expiresAt": "2025-12-31T23:59:59Z",
      "notes": "Premium license",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156
  },
  "statistics": {
    "total": 156,
    "byType": {
      "disabled": 80,
      "limited": 46,
      "full": 30
    },
    "byService": {
      "iam": 39,
      "cbm": 39,
      "aiwm": 39,
      "noti": 39
    }
  }
}
```

#### Response Fields

**data[]**: Mảng các license records

**pagination**:
- `page`: Trang hiện tại
- `limit`: Số items per page
- `total`: Tổng số licenses (sau filter)

**statistics**:
- `total`: Tổng số licenses
- `byType`: Thống kê theo loại license
  - `disabled`: Số lượng licenses bị disable
  - `limited`: Số lượng licenses limited
  - `full`: Số lượng licenses full
- `byService`: Thống kê theo service
  - `iam`, `cbm`, `aiwm`, `noti`: Số lượng licenses cho từng service

**💡 Use case cho statistics:**
- Dashboard overview: Hiển thị tổng quan licenses trong hệ thống
- Chart/Graph: Vẽ biểu đồ phân bố license types
- Monitoring: Theo dõi số lượng org đang dùng từng service

---

## 4. Lấy License Theo ID

### `GET /licenses/:id`

Lấy thông tin chi tiết một license.

#### Path Parameters

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string | License ID (MongoDB ObjectId) |

#### Example Request

```bash
GET /licenses/507f1f77bcf86cd799439012
```

#### Response (200 OK)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "orgId": "507f1f77bcf86cd799439011",
  "serviceName": "aiwm",
  "type": "full",
  "quotaLimit": 1000,
  "quotaUsed": 250,
  "expiresAt": "2025-12-31T23:59:59Z",
  "notes": "Premium license - expires end of year",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:15:00Z",
  "createdBy": "68dcf365f6a92c0d4911b619",
  "updatedBy": "68dcf365f6a92c0d4911b620"
}
```

#### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "License with ID 507f1f77bcf86cd799439012 not found",
  "error": "Not Found"
}
```

---

## 5. Cập Nhật License

### `PATCH /licenses/:id`

Cập nhật một license. Chỉ cho phép cập nhật các trường: `type`, `quotaLimit`, `expiresAt`, `status`, `notes`.

**⚠️ Lưu ý:** KHÔNG thể thay đổi `orgId` và `serviceName` (đây là khóa định danh).

#### Path Parameters

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string | License ID (MongoDB ObjectId) |

#### Request Body

```json
{
  "type": "limited",
  "quotaLimit": 500,
  "expiresAt": "2025-06-30T23:59:59Z",
  "notes": "Downgraded to limited - 6 months extension"
}
```

#### Parameters (All Optional)

| Field | Type | Mô tả |
|-------|------|-------|
| `type` | string | Loại license: `disabled`, `limited`, `full` |
| `quotaLimit` | number | Giới hạn quota (null = unlimited) |
| `expiresAt` | string | Ngày hết hạn (ISO 8601 hoặc null) |
| `notes` | string | Ghi chú cập nhật |

#### Response (200 OK)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "orgId": "507f1f77bcf86cd799439011",
  "serviceName": "aiwm",
  "type": "limited",
  "quotaLimit": 500,
  "quotaUsed": 250,
  "expiresAt": "2025-06-30T23:59:59Z",
  "notes": "Downgraded to limited - 6 months extension",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-22T09:45:00Z",
  "updatedBy": "68dcf365f6a92c0d4911b620"
}
```

#### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "License with ID 507f1f77bcf86cd799439012 not found",
  "error": "Not Found"
}
```

---

## 6. Xóa License

### `DELETE /licenses/:id`

Xóa mềm (soft delete) một license. License vẫn còn trong database nhưng bị đánh dấu `isDeleted: true`.

**⚠️ Lưu ý:** Không nên xóa license của service IAM vì sẽ ảnh hưởng đến authentication.

#### Path Parameters

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string | License ID (MongoDB ObjectId) |

#### Example Request

```bash
DELETE /licenses/507f1f77bcf86cd799439012
```

#### Response (200 OK)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "deletedAt": "2025-01-22T10:00:00Z"
}
```

#### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "License with ID 507f1f77bcf86cd799439012 not found",
  "error": "Not Found"
}
```

---

## 7. Lấy Thống Kê Licenses

### `GET /licenses/statistics/summary`

Lấy thống kê tổng hợp licenses, nhóm theo service và type.

#### Query Parameters

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `orgId` | string | ❌ | Filter thống kê theo organization |

#### Example Requests

```bash
# Thống kê toàn hệ thống
GET /licenses/statistics/summary

# Thống kê của một organization
GET /licenses/statistics/summary?orgId=507f1f77bcf86cd799439011
```

#### Response (200 OK)

```json
[
  {
    "_id": "iam",
    "types": [
      {
        "type": "full",
        "count": 39
      }
    ],
    "total": 39
  },
  {
    "_id": "aiwm",
    "types": [
      {
        "type": "disabled",
        "count": 20
      },
      {
        "type": "limited",
        "count": 12
      },
      {
        "type": "full",
        "count": 7
      }
    ],
    "total": 39
  },
  {
    "_id": "cbm",
    "types": [
      {
        "type": "disabled",
        "count": 30
      },
      {
        "type": "limited",
        "count": 6
      },
      {
        "type": "full",
        "count": 3
      }
    ],
    "total": 39
  },
  {
    "_id": "noti",
    "types": [
      {
        "type": "disabled",
        "count": 35
      },
      {
        "type": "limited",
        "count": 3
      },
      {
        "type": "full",
        "count": 1
      }
    ],
    "total": 39
  }
]
```

#### Response Format

Mảng các object, mỗi object đại diện cho một service:

| Field | Type | Mô tả |
|-------|------|-------|
| `_id` | string | Service name (`iam`, `cbm`, `aiwm`, `noti`) |
| `types[]` | array | Mảng thống kê theo từng license type |
| `types[].type` | string | License type (`disabled`, `limited`, `full`) |
| `types[].count` | number | Số lượng licenses thuộc type này |
| `total` | number | Tổng số licenses của service |

**💡 Use case:**
- Dashboard admin: Hiển thị overview toàn hệ thống
- Service adoption metrics: Service nào được dùng nhiều nhất
- License distribution: Phân bố các loại license

---

## 8. Load Organizations cho Dropdown

### `GET /organizations`

Load danh sách organizations để hiển thị trong dropdown/select khi tạo hoặc sửa license.

#### Query Parameters

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `page` | number | ❌ | Trang hiện tại (default: 1) |
| `limit` | number | ❌ | Số items per page (default: 10, max: 100 cho dropdown) |
| `sort` | string | ❌ | Sắp xếp theo tên: `name` hoặc `-name` |

#### Example Request

```bash
# Load tất cả orgs cho dropdown (không phân trang)
GET /organizations?limit=1000&sort=name

# Hoặc với phân trang
GET /organizations?page=1&limit=50&sort=name
```

#### Response (200 OK)

```json
{
  "data": [
    {
      "_id": "691eb9e6517f917943ae1f9d",
      "name": "Acme Corporation",
      "caption": "Enterprise Plan",
      "description": "Main production organization",
      "type": "enterprise",
      "createdAt": "2025-01-10T08:00:00Z"
    },
    {
      "_id": "691eb9e6517f917943ae1f9e",
      "name": "Beta Startup Inc",
      "caption": "Startup Plan",
      "description": "Development environment",
      "type": "startup",
      "createdAt": "2025-01-12T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125
  }
}
```

#### Frontend Display Format

**Select Option Format:**
```html
<option value="691eb9e6517f917943ae1f9d">
  Acme Corporation
  <691eb9e6517f917943ae1f9d>
</option>
```

**React/Vue Format:**
```javascript
{
  value: "691eb9e6517f917943ae1f9d",
  label: "Acme Corporation",
  caption: "691eb9e6517f917943ae1f9d"
}

// Hiển thị:
// Acme Corporation
// <691eb9e6517f917943ae1f9d>
```

**💡 UI Recommendations:**

1. **Autocomplete/Search:**
   - Enable search trong dropdown
   - Match theo `name` hoặc `_id`
   - Highlight matched text

2. **Display Format:**
   ```
   [Organization Name]
   <[Organization ID]>
   ```
   Ví dụ:
   ```
   Acme Corporation
   <691eb9e6517f917943ae1f9d>
   ```

3. **Loading State:**
   - Show skeleton/spinner khi load organizations
   - Cache results để tránh reload nhiều lần

4. **Empty State:**
   - "No organizations found" nếu list rỗng
   - Link to create organization page

---

## Common Response Fields

Tất cả license records đều có các trường sau:

### Core Fields

| Field | Type | Mô tả |
|-------|------|-------|
| `_id` | string | License ID (MongoDB ObjectId) |
| `orgId` | string | Organization ID |
| `serviceName` | string | Service name: `iam`, `cbm`, `aiwm`, `noti` |
| `type` | string | License type: `disabled`, `limited`, `full` |

### Optional/Future Fields

| Field | Type | Mô tả |
|-------|------|-------|
| `quotaLimit` | number/null | Giới hạn quota. `null` = unlimited. **Chưa enforce** |
| `quotaUsed` | number | Quota đã sử dụng. **Chưa track** |
| `expiresAt` | string/null | Ngày hết hạn (ISO 8601). `null` = never expires. **Chưa enforce** |
| `notes` | string | Ghi chú nội bộ |

### Audit Fields

| Field | Type | Mô tả |
|-------|------|-------|
| `createdAt` | string | Ngày tạo (ISO 8601) |
| `updatedAt` | string | Ngày cập nhật cuối (ISO 8601) |
| `createdBy` | string | User ID người tạo |
| `updatedBy` | string | User ID người cập nhật cuối |

### Soft Delete Fields (Internal)

| Field | Type | Mô tả |
|-------|------|-------|
| `isDeleted` | boolean | Đã xóa hay chưa (không trả về trong response) |
| `deletedAt` | string | Ngày xóa (chỉ trả về khi delete) |

---

## Authorization

### Required Role

Tất cả endpoints yêu cầu role **`universe.owner`** trong JWT token.

### JWT Token Format

```json
{
  "sub": "68dcf365f6a92c0d4911b619",
  "username": "username",
  "status": "active",
  "roles": ["universe.owner"],
  "orgId": "",
  "licenses": {
    "iam": "full",
    "cbm": "full",
    "aiwm": "full",
    "noti": "full"
  }
}
```

### Error Response (403 Forbidden)

Nếu user không có role `universe.owner`:

```json
{
  "statusCode": 403,
  "message": "This endpoint requires universe.owner role",
  "error": "Forbidden"
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Ý nghĩa | Khi nào xảy ra |
|------|---------|---------------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo mới thành công |
| 400 | Bad Request | Validation errors, dữ liệu không hợp lệ |
| 401 | Unauthorized | Thiếu hoặc sai JWT token |
| 403 | Forbidden | Không có quyền (thiếu role universe.owner) |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | License đã tồn tại (duplicate) |
| 500 | Internal Server Error | Lỗi server |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

hoặc với chi tiết validation:

```json
{
  "statusCode": 400,
  "message": [
    "orgId must be a valid MongoDB ObjectId",
    "type must be one of: disabled, limited, full"
  ],
  "error": "Bad Request"
}
```

---

## Frontend Integration Notes

### 1. License Management Dashboard

**Page Load Sequence:**
```javascript
// 1. Load organizations cho dropdown (parallel với licenses)
GET /organizations?limit=1000&sort=name

// 2. Load licenses list
GET /licenses?page=1&limit=10

// Thực hiện song song để tối ưu loading time
Promise.all([
  fetchOrganizations(),
  fetchLicenses()
])
```

**Hiển thị danh sách:**
- Dùng `GET /licenses` với pagination
- Hiển thị statistics từ response để tạo overview cards
- Filter theo orgId khi xem licenses của một org cụ thể

**Tạo license mới:**
- Form với organization dropdown (load từ `GET /organizations`)
- Organization select format:
  ```
  [Org Name]
  <[Org ID]>
  ```
- Validation theo spec ở trên
- Dùng `POST /licenses` hoặc `POST /licenses/default`
- Handle error 409 (duplicate) để thông báo user

**Sửa license:**
- Dùng `PATCH /licenses/:id`
- Chỉ cho phép sửa: type, quotaLimit, expiresAt, notes
- **DISABLE fields**: `orgId` và `serviceName` (không cho phép thay đổi)
- Show orgId và serviceName as read-only text

**Xóa license:**
- Confirm dialog trước khi xóa
- Warning đặc biệt nếu xóa license của IAM service
- Dùng `DELETE /licenses/:id`

### 2. Organization Detail Page

**Hiển thị licenses của org:**
```javascript
GET /licenses?orgId={organizationId}
```

**Tạo default licenses khi tạo org mới:**
```javascript
// Sau khi tạo org thành công
POST /licenses/default
{
  "orgId": newOrganization._id,
  "notes": "Auto-generated on organization creation"
}
```

### 3. Statistics Dashboard

**Overview cards:**
```javascript
GET /licenses/statistics/summary
// Response dùng để vẽ charts:
// - Pie chart: License distribution by service
// - Bar chart: License types distribution
// - Numbers: Total licenses, by type counts
```

**Realtime data:**
```javascript
GET /licenses?page=1&limit=10
// statistics object trong response:
// - Total licenses
// - byType distribution
// - byService distribution
```

### 4. Validation Rules

**orgId:**
- Required
- Must be valid MongoDB ObjectId (24 hex characters)
- Organization phải tồn tại trong database

**serviceName:**
- Required
- Must be one of: `iam`, `cbm`, `aiwm`, `noti`

**type:**
- Required
- Must be one of: `disabled`, `limited`, `full`

**quotaLimit:**
- Optional
- Must be number >= 0 hoặc null

**expiresAt:**
- Optional
- Must be valid ISO 8601 date string hoặc null

### 5. UI/UX Recommendations

**License Type Display:**
```
disabled → Red badge with "Disabled" text
limited  → Yellow badge with "Limited" text
full     → Green badge with "Full Access" text
```

**Date Display:**
```javascript
// Format expiresAt
new Date(expiresAt).toLocaleDateString()
// Hoặc relative time: "Expires in 45 days"
```

**Filter/Search:**
- Dropdown filter by service
- Dropdown filter by type
- Search by orgId (autocomplete)

### 6. Sample API Call Flow

**Tạo license flow:**
```
1. User clicks "Create License"
2. Form validation (client-side)
3. POST /licenses
4. If 409 → Show "License already exists"
5. If 404 → Show "Organization not found"
6. If 201 → Success, refresh list
```

**Update license flow:**
```
1. User clicks "Edit" on license row
2. Load current data to form
3. User changes type/quota/notes
4. PATCH /licenses/:id
5. If 200 → Success, update UI
6. If 404 → Show "License no longer exists"
```

---

## Testing với cURL

### Lấy JWT Token

```bash
# Login để lấy token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "..."
  }'

# Lưu token vào biến
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test Endpoints

```bash
# 1. Tạo license
curl -X POST http://localhost:3000/licenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "691eb9e6517f917943ae1f9d",
    "serviceName": "aiwm",
    "type": "full",
    "notes": "Test license"
  }'

# 2. Lấy danh sách
curl -X GET "http://localhost:3000/licenses?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 3. Filter theo orgId
curl -X GET "http://localhost:3000/licenses?orgId=691eb9e6517f917943ae1f9d" \
  -H "Authorization: Bearer $TOKEN"

# 4. Lấy một license
curl -X GET "http://localhost:3000/licenses/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer $TOKEN"

# 5. Cập nhật license
curl -X PATCH "http://localhost:3000/licenses/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "limited",
    "notes": "Downgraded to limited"
  }'

# 6. Xóa license
curl -X DELETE "http://localhost:3000/licenses/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer $TOKEN"

# 7. Lấy statistics
curl -X GET "http://localhost:3000/licenses/statistics/summary" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Phase 1 Limitations

**Các tính năng chưa được enforce (reserved cho Phase 2):**

1. **Quota Enforcement**:
   - `quotaLimit` và `quotaUsed` được lưu nhưng chưa được check
   - Frontend có thể hiển thị nhưng backend chưa enforce

2. **Expiration Check**:
   - `expiresAt` được lưu nhưng chưa được check
   - License không tự động expire

3. **Active License Invalidation**:
   - Thay đổi license chỉ có hiệu lực sau khi user refresh token
   - Passive update (đợi token hết hạn)

4. **Audit Logging**:
   - Basic audit fields (createdBy, updatedBy) có
   - Chi tiết license change logs chưa có

**Vẫn hoạt động tốt:**
- ✅ License type enforcement (disabled/limited/full)
- ✅ RBAC integration (chỉ universe.owner)
- ✅ JWT embedding (licenses trong token payload)
- ✅ Auto-create on org creation
- ✅ CRUD operations
- ✅ Statistics và reporting
