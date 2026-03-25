<template>
  <v-container class="py-8" max-width="800">
    <v-card>
      <v-card-title>Live Order Notifications</v-card-title>
      <v-divider></v-divider>

      <v-card-text class="py-6" style="min-height: 500px">
        <div v-if="notifications.length === 0" class="text-center text-grey py-8">
          <p class="text-sm">No notifications yet</p>
        </div>

        <div v-else>
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="mb-4 pb-4"
            style="border-bottom: 1px solid #eee;"
          >
            <p class="text-sm ma-0">{{ notification.message }}</p>
            <p class="text-xs text-grey-darken-1 mt-1">
              Sent to {{ notification.recipient }} at
              {{ formatTime(notification.sentAt) }}
            </p>
          </div>
        </div>
      </v-card-text>

      <v-divider v-if="notifications.length > 0"></v-divider>
      <v-card-actions v-if="notifications.length > 0">
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" @click="clearNotifications">
          Clear live buffer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const wsUrl =
  import.meta.env.VITE_NOTIFICATION_WS || 'ws://localhost:3003/ws/notifications';

const notifications = ref([]);

let socket;

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clearNotifications() {
  notifications.value = [];
}

onMounted(() => {
  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    notifications.value = [
      notification,
      ...notifications.value.filter((item) => item.id !== notification.id),
    ];
  };
});

onUnmounted(() => {
  socket?.close();
});
</script>
