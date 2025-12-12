# Project & Work Design Specification (Minimal Version)

## 1. Project Entity

### 1.1 Purpose

Project dùng để nhóm các Work và quản lý các phạm vi công việc lớn. Đây
là phiên bản tối thiểu, tập trung vào nghiệp vụ cốt lõi.

### 1.2 Attributes

-   **id**
-   **name** (bắt buộc)
-   **description** (optional)
-   **owner** (bắt buộc, yêu cầu owner phải active)
-   **members** (optional)
-   **priority** (optional)
-   **startDate / dueDate** (optional)
-   **tags** (optional)
-   **documents** (optional)
-   **status**: draft \| active \| on_hold \| completed \| archived
    (default: draft)

### 1.3 Rules

-   Khi tạo mới bắt buộc có owner và owner phải active.
-   Không có chức năng delete, chỉ có **archived**.
-   Chưa cần log lịch sử thay đổi (ghi chú: cần bổ sung phase sau).

### 1.4 State Actions

Đề xuất dùng action theo trạng thái: - **activateProject** (draft →
active) - **holdProject** (active → on_hold) - **resumeProject**
(on_hold → active) - **completeProject** (active → completed) -
**archiveProject** (completed → archived)

------------------------------------------------------------------------

## 2. Work Entity

### 2.1 Purpose

Work dùng để mô tả từng công việc cụ thể hoặc mục tiêu lớn. Có 3 loại: -
**epic**: phạm vi lớn - **task**: công việc chính - **subtask**: công
việc chi tiết

### 2.2 Attributes

-   **id**
-   **title** (bắt buộc)
-   **summary** (optional)
-   **description** (markdown content)
-   **type**: epic \| task \| subtask
-   **projectId**: optional
-   **reporter**: `{ type: agent/user, id }` (bắt buộc)
-   **assignee**: `{ type: agent/user, id }` (optional)
-   **priority**: optional
-   **dueDate**: optional
-   **startAt**: optional (trigger agent thực thi theo thời gian)
-   **status**:
    -   backlog (chờ kế hoạch)
    -   todo (chờ làm)
    -   in_progress (đang làm)
    -   blocked (gặp lỗi)
    -   cancelled (hủy)
    -   review (chờ duyệt)
    -   done (xong)
-   **blockedBy**: string\[\] (id các Work khác)
-   **parentId**: nếu là subtask
-   **documents**: optional

### 2.3 Rules

-   Work có projectId là optional.
-   Subtask tạo sau khi Work cha tồn tại.
-   Không cần kiểm tra assignee có thuộc project hay không.
-   Chưa cần log audit (ghi chú: bổ sung phase sau).
-   Thay đổi assignee chưa cần notification.

### 2.4 State Actions

Đề xuất dùng action thay vì changeStatus để rõ ràng cho user + agent: -
**startWork** (todo → in_progress) - **blockWork** (in_progress →
blocked) - **unblockWork** (blocked → in_progress) - **requestReview**
(in_progress → review) - **completeWork** (review → done) -
**reopenWork** (done → in_progress) - **cancelWork** (any → cancelled)

------------------------------------------------------------------------

## 3. Relationships

### Project --- Work

-   Một Project có nhiều Work.
-   Work có thể tồn tại không thuộc Project.

### Work --- Subtask

-   Subtask có parentId trỏ về Work cha.
-   Khi tất cả subtask done → hệ thống có thể auto update progress
    (phase sau).

### Work Dependencies

-   Work có **blockedBy: string\[\]**
-   BlockedBy là danh sách id của Work khác.

------------------------------------------------------------------------

## 4. Functional Requirements

### 4.1 Project Functions

-   Tạo mới Project
-   Cập nhật thông tin Project
-   Thay đổi trạng thái qua action
-   Archive Project
-   (Ghi chú) Bổ sung activity log ở phiên bản sau

### 4.2 Work Functions

-   Tạo Work
-   Cập nhật Work
-   Tạo Subtask sau khi Work cha tồn tại
-   Thay đổi trạng thái qua action
-   Cập nhật dependencies
-   (Ghi chú) Bổ sung audit log và thông báo ở phiên bản sau

------------------------------------------------------------------------

## 5. Notes for Developer

-   File này mô tả nghiệp vụ và kỹ thuật cơ bản.
-   Về backend: cần thiết kế schema, migration, repository, service,
    controller.
-   Tách rõ ràng logic của từng action để tránh cập nhật trạng thái sai.
-   Khi đến phase 2 cần bổ sung:
    -   Activity log cho Project & Work
    -   Notification (assign, status change)
    -   Auto progress dựa trên subtask
    -   Workflow mở rộng (configurable)
