<template>
    <ActionButtonUI
        :text="$t('nav.templates')"
        @click="emit('open-templates')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><FileText /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        :text="$t('nav.history')"
        @click="emit('open-history')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><History /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        :text="$t('nav.favorites')"
        @click="emit('open-favorites')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><Star /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        v-if="isReportMode"
        :text="$t('nav.dataManager')"
        @click="emit('open-data-manager')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><DeviceFloppy /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        v-if="isReportMode"
        text="数据源管理"
        @click="emit('open-datasource')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><Database /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        v-else
        :text="$t('nav.variableManager')"
        @click="emit('open-variables')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><Variable /></NIcon>
        </template>
    </ActionButtonUI>

    <!-- 🔐 用户管理（仅管理员可见） -->
    <ActionButtonUI
        v-if="authStore.isAdmin"
        text="用户管理"
        @click="emit('open-user-management')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><Users /></NIcon>
        </template>
    </ActionButtonUI>

    <ActionButtonUI
        text="用户手册"
        @click="emit('open-user-manual')"
        type="default"
        size="small"
        :ghost="false"
        :round="true"
    >
        <template #icon>
            <NIcon class="bank-action-icon"><Help /></NIcon>
        </template>
    </ActionButtonUI>

    </template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { Database, DeviceFloppy, FileText, Help, History, Star, Users, Variable } from '@vicons/tabler'
import ActionButtonUI from '../ActionButton.vue'
import { useAuthStore } from '../../stores/auth/useAuthStore'

interface Props {
    appVersion: string
    isReportMode?: boolean
}

defineProps<Props>()

const authStore = useAuthStore()

const emit = defineEmits<{
    'open-templates': []
    'open-history': []
    'open-model-manager': []
    'open-favorites': []
    'open-data-manager': []
    'open-variables': []
    'open-datasource': []
    'open-website': []
    'open-docs': []
    'open-github': []
    'open-user-manual': []
    'open-user-management': []
}>()
</script>

<style scoped>
:deep(.action-button) {
    min-width: 88px;
    height: 26px;
    padding: 0 12px !important;
    border-color: rgba(111, 50, 155, 0.16) !important;
    background: rgba(255, 255, 255, 0.96) !important;
    box-shadow: 0 1px 5px rgba(43, 27, 67, 0.04);
}

:deep(.action-button .n-button__text) {
    color: #000000 !important;
}

:deep(.action-button:hover) {
    border-color: rgba(111, 50, 155, 0.32) !important;
    background: rgba(111, 50, 155, 0.055) !important;
}

:deep(.action-button:hover .n-button__text) {
    color: #000000 !important;
}

:deep(.action-button .n-button__icon) {
    margin-right: 4px;
}

:deep(.action-button .text-sm) {
    font-size: 11px;
    font-weight: 500;
}

.bank-action-icon {
    color: #a973c1;
    font-size: 13px;
}
</style>
