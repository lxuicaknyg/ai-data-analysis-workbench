<template>
  <div class="user-management">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <div class="header-right">
        <NButton @click="goHome" class="back-btn">← 返回首页</NButton>
        <NButton type="primary" @click="showAddDialog = true">添加用户</NButton>
      </div>
    </div>

    <NCard :bordered="false" class="user-table-card">
      <NDataTable
        :columns="columns"
        :data="users"
        :pagination="pagination"
        :row-key="(row: UserInfo) => row.id"
      />
    </NCard>

    <NModal v-model:show="showAddDialog" preset="card" title="添加用户">
      <NForm ref="formRef" :model="formData" class="user-form">
        <NFormItem label="用户名" path="username" :rule="[{ required: true, message: '请输入用户名' }]">
          <NInput v-model:value="formData.username" />
        </NFormItem>
        <NFormItem label="密码" path="password" :rule="[{ required: true, message: '请输入密码' }]">
          <NInput v-model:value="formData.password" type="password" />
        </NFormItem>
        <NFormItem label="角色">
          <NRadioGroup v-model:value="formData.role">
            <NSpace>
              <NRadio value="admin">管理员</NRadio>
              <NRadio value="user">普通用户</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <div class="form-actions">
          <NButton @click="showAddDialog = false">取消</NButton>
          <NButton type="primary" @click="saveUser">保存</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue';
import { useMessage } from 'naive-ui';
import { NButton, NCard, NDataTable, NTag, NSpace, NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio, type DataTableColumns } from 'naive-ui';
import type { UserInfo } from '../../stores/auth/useAuthStore';
import { useRouter } from 'vue-router';

const message = useMessage();
const router = useRouter();
const showAddDialog = ref(false);
const formRef = ref();
const editingUserId = ref<number | null>(null);

const formData = reactive({
  username: '',
  password: '',
  role: 'user' as 'admin' | 'user'
});

const pagination = {
  page: 1,
  pageSize: 10
};

const users = ref<UserInfo[]>([]);

const columns: DataTableColumns<UserInfo> = [
  { title: 'ID', key: 'id' },
  { title: '用户名', key: 'username' },
  { 
    title: '角色', 
    key: 'role',
    render: (row: UserInfo) => {
      const type = row.role === 'admin' ? 'success' : 'default';
      const text = row.role === 'admin' ? '管理员' : '普通用户';
      return h(NTag, { type }, { default: () => text });
    }
  },
  { 
    title: '操作', 
    key: 'actions',
    render: (row: UserInfo) => {
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => editUser(row) }, { default: () => '编辑' }),
          h(NButton, { size: 'small', type: 'error', onClick: () => deleteUser(row.id) }, { default: () => '删除' })
        ]
      });
    }
  }
];

const goHome = () => {
  router.push('/report/analyze');
};

const loadUsers = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) {
      users.value = result.data;
    } else {
      message.error(result.message || '获取用户列表失败');
    }
  } catch (error) {
    console.error('获取用户列表失败:', error);
    message.error('获取用户列表失败');
  }
};

const editUser = (user: UserInfo) => {
  editingUserId.value = user.id;
  formData.username = user.username;
  formData.password = '';
  formData.role = user.role;
  showAddDialog.value = true;
};

const deleteUser = async (userId: number) => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (result.success) {
      users.value = users.value.filter(u => u.id !== userId);
      message.success('删除成功');
    } else {
      message.error(result.message || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

const saveUser = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;

  try {
    const token = localStorage.getItem('token');
    if (editingUserId.value) {
      const response = await fetch(`/api/users/${editingUserId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password || undefined,
          role: formData.role
        })
      });
      const result = await response.json();
      if (result.success) {
        const index = users.value.findIndex(u => u.id === editingUserId.value);
        if (index !== -1) {
          users.value[index].username = formData.username;
          users.value[index].role = formData.role;
        }
        message.success('更新成功');
      } else {
        message.error(result.message || '更新失败');
      }
    } else {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.role
        })
      });
      const result = await response.json();
      if (result.success) {
        users.value.push({
          id: result.data.id,
          username: result.data.username,
          role: result.data.role
        });
        message.success('添加成功');
      } else {
        message.error(result.message || '添加失败');
      }
    }
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  }

  showAddDialog.value = false;
  resetForm();
};

const resetForm = () => {
  editingUserId.value = null;
  formData.username = '';
  formData.password = '';
  formData.role = 'user';
};

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  font-size: 14px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.user-table-card {
  margin-top: 16px;
}

.user-form {
  width: 400px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>