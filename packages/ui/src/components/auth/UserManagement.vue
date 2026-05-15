<template>
  <div class="user-management">
    <div class="page-header">
      <h1 class="page-title">{{ t('auth.userManagement') }}</h1>
      <NButton type="primary" @click="showAddDialog = true">
        {{ t('auth.addUser') }}
      </NButton>
    </div>

    <NCard :bordered="false" class="user-table-card">
      <NDataTable
        :columns="columns"
        :data="users"
        :pagination="pagination"
        row-key="id"
      >
        <template #role="{ row }">
          <NTag :type="row.role === 'admin' ? 'success' : 'default'">
            {{ row.role === 'admin' ? t('auth.admin') : t('auth.user') }}
          </NTag>
        </template>
        <template #actions="{ row }">
          <NSpace>
            <NButton size="small" @click="editUser(row)">
              {{ t('common.edit') }}
            </NButton>
            <NButton size="small" type="error" @click="deleteUser(row.id)">
              {{ t('common.delete') }}
            </NButton>
          </NSpace>
        </template>
      </NDataTable>
    </NCard>

    <!-- 添加/编辑用户弹窗 -->
    <NModal v-model:show="showAddDialog" preset="card" title="Add User">
      <NForm ref="formRef" :model="formData" class="user-form">
        <NFormItem 
          label="Username" 
          path="username" 
          :rule="[{ required: true, message: 'Username is required' }]"
        >
          <NInput v-model:value="formData.username" />
        </NFormItem>
        <NFormItem 
          label="Password" 
          path="password" 
          :rule="[{ required: true, message: 'Password is required' }]"
        >
          <NInput v-model:value="formData.password" type="password" />
        </NFormItem>
        <NFormItem label="Role">
          <NRadioGroup v-model:value="formData.role">
            <NSpace>
              <NRadio value="admin">Admin</NRadio>
              <NRadio value="user">User</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <div class="form-actions">
          <NButton @click="showAddDialog = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="saveUser">{{ t('common.save') }}</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<script setup lang="ts">import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { UserInfo } from '../../stores/auth/useAuthStore';
const { t } = useI18n();
const message = useMessage();
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
// 模拟用户数据
const users = ref<UserInfo[]>([
 { id: 1, username: 'admin', role: 'admin' },
 { id: 2, username: 'user1', role: 'user' },
 { id: 3, username: 'user2', role: 'user' },
 { id: 4, username: 'user3', role: 'user' }
]);
const columns = [
 { title: 'ID', key: 'id' },
 { title: 'Username', key: 'username' },
 { title: 'Role', key: 'role', render: 'role' },
 { title: 'Actions', key: 'actions', render: 'actions' }
];
const editUser = (user: UserInfo) => {
 editingUserId.value = user.id;
 formData.username = user.username;
 formData.password = '';
 formData.role = user.role;
 showAddDialog.value = true;
};
const deleteUser = (userId: number) => {
 users.value = users.value.filter(u => u.id !== userId);
 message.success(t('auth.userDeleted'));
};
const saveUser = async () => {
 if (!formRef.value)
 return;
 const valid = await formRef.value.validate();
 if (!valid)
 return;
 if (editingUserId.value) {
 // 编辑现有用户
 const index = users.value.findIndex(u => u.id === editingUserId.value);
 if (index !== -1) {
 users.value[index] = {
 ...users.value[index],
 username: formData.username,
 role: formData.role
 };
 }
 message.success(t('auth.userUpdated'));
 }
 else {
 // 添加新用户
 const newUser: UserInfo = {
 id: Date.now(),
 username: formData.username,
 role: formData.role
 };
 users.value.push(newUser);
 message.success(t('auth.userAdded'));
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