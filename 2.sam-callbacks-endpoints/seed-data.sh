#!/bin/bash
# =============================================================================
# Seed completo con datos reales de producción (CSVs de BPPR)
# Pobla: QueueConfiguration, QueueGroupInfo, CallbackConcurrencyMetrics,
#        QueueRegisterStats, CallsInSystem, CallbackReports, SSM config
#
# Prerequisito: ejecutar seed-floci.sh primero (crea tablas y estructura)
# Uso: bash seed-data.sh
# =============================================================================

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

echo "🔄 Seeding datos reales de producción..."
echo ""

# =============================================================================
# QueueConfiguration — datos reales del CSV queueConfig.csv
# PK: queue_name
# =============================================================================
echo "📋 QueueConfiguration (20 queues reales)..."

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Sale English"},"queue_id":{"S":"ecbc8148-be81-441b-9e30-c0fefdcbaf89"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"22:00"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/6eab14af-4576-4818-8457-04da2dc9d0c2"}
}' 2>/dev/null && echo "  ✅ VHCallback Sale English" || echo "  ⚠️  VHCallback Sale English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Prem English"},"queue_id":{"S":"6c55d693-941f-4fcc-b1b7-9abc4289d6f9"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/166ba131-c5ce-482f-a378-962220a1d5ef"}
}' 2>/dev/null && echo "  ✅ VHCallback Prem English" || echo "  ⚠️  VHCallback Prem English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Cust"},"queue_id":{"S":"b604decc-6126-4359-97e6-400162d5791d"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"11:00"},"stop_time_asap":{"S":"21:20"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243650"},"outbound_phone_number":{"S":"+17877243650"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/c2d3a466-510a-4337-95ac-d13f72cf3b33"}
}' 2>/dev/null && echo "  ✅ VHCallback Cust" || echo "  ⚠️  VHCallback Cust"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback PB Eng"},"queue_id":{"S":"11a04cd4-acd3-4a7d-ab1f-d19d787df204"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"13:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"18003770800"},"outbound_phone_number":{"S":"+18003770800"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/bc4f2d0b-3831-495c-8c47-cc277039a634"}
}' 2>/dev/null && echo "  ✅ VHCallback PB Eng" || echo "  ⚠️  VHCallback PB Eng"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Cust English"},"queue_id":{"S":"2740a95b-4b1e-4107-9c57-a9a480142066"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"11:00"},"stop_time_asap":{"S":"21:20"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243659"},"outbound_phone_number":{"S":"+17877243659"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/c2d3a466-510a-4337-95ac-d13f72cf3b33"}
}' 2>/dev/null && echo "  ✅ VHCallback Cust English" || echo "  ⚠️  VHCallback Cust English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallbackTrust"},"queue_id":{"S":"bb788c7b-a181-43bf-80c0-0e4fd8444118"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243657"},"outbound_phone_number":{"S":"+17877243657"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/8ee0c0bf-d548-4fa0-8f58-c01e4f87c4a1"}
}' 2>/dev/null && echo "  ✅ VHCallbackTrust" || echo "  ⚠️  VHCallbackTrust"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Come English"},"queue_id":{"S":"37ff1adb-98fc-4824-92c9-7e32a5d5e09a"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"21:00"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877563939"},"outbound_phone_number":{"S":"+17877563939"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/bf268a7b-2730-4b31-bf35-9d55ef6195f9"}
}' 2>/dev/null && echo "  ✅ VHCallback Come English" || echo "  ⚠️  VHCallback Come English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VH Callback CP"},"queue_id":{"S":"0bc06cbd-0895-4f18-ba64-c961dd72e413"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:45"},"stop_time_asap":{"S":"21:15"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877580505"},"outbound_phone_number":{"S":"+17877580505"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/ff4a5321-d6c5-4604-aa1f-8dd144bbac42"}
}' 2>/dev/null && echo "  ✅ VH Callback CP" || echo "  ⚠️  VH Callback CP"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallbackTrust English"},"queue_id":{"S":"e9b1ecdd-4d55-4a94-963f-c0d3fff04b3d"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243657"},"outbound_phone_number":{"S":"+17877243657"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/8ee0c0bf-d548-4fa0-8f58-c01e4f87c4a1"}
}' 2>/dev/null && echo "  ✅ VHCallbackTrust English" || echo "  ⚠️  VHCallbackTrust English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VH Callback CP English"},"queue_id":{"S":"c61c878f-74bc-475a-9d35-69df3c3e0848"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:45"},"stop_time_asap":{"S":"21:15"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877580505"},"outbound_phone_number":{"S":"+17877580505"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/ff4a5321-d6c5-4604-aa1f-8dd144bbac42"}
}' 2>/dev/null && echo "  ✅ VH Callback CP English" || echo "  ⚠️  VH Callback CP English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Sale"},"queue_id":{"S":"c211aaf7-e4ab-4fc6-b791-a1828432acdf"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"22:00"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/6eab14af-4576-4818-8457-04da2dc9d0c2"}
}' 2>/dev/null && echo "  ✅ VHCallback Sale" || echo "  ⚠️  VHCallback Sale"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback PB"},"queue_id":{"S":"7d7ca7c8-1e7e-4a2c-9a25-3d03cf30c55e"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"13:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"18003770800"},"outbound_phone_number":{"S":"+18003770800"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/bc4f2d0b-3831-495c-8c47-cc277039a634"}
}' 2>/dev/null && echo "  ✅ VHCallback PB" || echo "  ⚠️  VHCallback PB"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback ATHM"},"queue_id":{"S":"0fe31a7a-03e8-4b73-8a7b-4f5298e256e1"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:30"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/6dcbcd38-efeb-4d0e-b5cf-6fee42a960aa"}
}' 2>/dev/null && echo "  ✅ VHCallback ATHM" || echo "  ⚠️  VHCallback ATHM"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback MiBa"},"queue_id":{"S":"546358d3-9708-48f9-a3dd-e7a07f3ffba7"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"11:00"},"stop_time_asap":{"S":"21:15"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/04b0b650-a750-4486-8e12-ac878a852848"}
}' 2>/dev/null && echo "  ✅ VHCallback MiBa" || echo "  ⚠️  VHCallback MiBa"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Prem"},"queue_id":{"S":"191b761d-096e-4c9c-a7a9-307066a26499"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/166ba131-c5ce-482f-a378-962220a1d5ef"}
}' 2>/dev/null && echo "  ✅ VHCallback Prem" || echo "  ⚠️  VHCallback Prem"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback Come"},"queue_id":{"S":"f363be1b-605c-48bc-8112-ef6071335283"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:00"},"stop_time_asap":{"S":"21:00"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877563939"},"outbound_phone_number":{"S":"+17877563939"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/bf268a7b-2730-4b31-bf35-9d55ef6195f9"}
}' 2>/dev/null && echo "  ✅ VHCallback Come" || echo "  ⚠️  VHCallback Come"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallbackPAuto English"},"queue_id":{"S":"f7b1726d-dd5f-472f-9bf4-23977d59cd17"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:30"},"stop_time_asap":{"S":"20:45"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877929282"},"outbound_phone_number":{"S":"+17877929282"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/4dc0f8a2-5cb1-4921-8577-e7f7f049c431"}
}' 2>/dev/null && echo "  ✅ VHCallbackPAuto English" || echo "  ⚠️  VHCallbackPAuto English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallbackPAuto"},"queue_id":{"S":"5225229f-bc93-4a1f-a0aa-9e7597ae1337"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:30"},"stop_time_asap":{"S":"20:45"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877929282"},"outbound_phone_number":{"S":"+17877929282"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/4dc0f8a2-5cb1-4921-8577-e7f7f049c431"}
}' 2>/dev/null && echo "  ✅ VHCallbackPAuto" || echo "  ⚠️  VHCallbackPAuto"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback ATHM English"},"queue_id":{"S":"f1bcada1-c316-49ee-a97f-5a3497ee26e4"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"12:30"},"stop_time_asap":{"S":"20:30"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/6dcbcd38-efeb-4d0e-b5cf-6fee42a960aa"}
}' 2>/dev/null && echo "  ✅ VHCallback ATHM English" || echo "  ⚠️  VHCallback ATHM English"

aws dynamodb put-item --table-name QueueConfiguration --endpoint-url $AWS_ENDPOINT_URL --item '{
  "queue_name":{"S":"VHCallback MiBa English"},"queue_id":{"S":"580e2c25-6c86-4c9d-b0a9-77a5dc0f63e3"},"max_retry_attempts":{"N":"3"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"allowed_callback_type":{"S":"ALLOW_SCHEDULING"},"allow_only_next_day":{"BOOL":false},"business_hours_custom_message":{"S":"mensaje custom"},"business_hours_enable":{"BOOL":true},"start_time_asap":{"S":"11:00"},"stop_time_asap":{"S":"21:15"},"stop_time_asap_enable":{"BOOL":true},"ewt_max_minutes_enable":{"BOOL":true},"ewt_max_minutes":{"N":"5"},"phone_number_for_client":{"S":"7877243655"},"outbound_phone_number":{"S":"+17877243655"},"flow_arn":{"S":"arn:aws:connect:us-east-1:269763020244:instance/73562e5a-dfd3-4f3f-a859-f30792854849/contact-flow/04b0b650-a750-4486-8e12-ac878a852848"}
}' 2>/dev/null && echo "  ✅ VHCallback MiBa English" || echo "  ⚠️  VHCallback MiBa English"


# =============================================================================
# QueueGroupInfo — inferido de queueAssociation.csv (callback queues únicos)
# PK: queue_name (nombre del callback queue)
# =============================================================================
echo ""
echo "🏷️  QueueGroupInfo (grupos de callback queues)..."

aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Sale"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Sale English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Cust"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Cust English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Come"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Come"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Come English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Come English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VH Callback CP"},"after_threshold_behavior":{"S":"QUEUE"}}' 2>/dev/null && echo "  ✅ VH Callback CP"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VH Callback CP English"},"after_threshold_behavior":{"S":"QUEUE"}}' 2>/dev/null && echo "  ✅ VH Callback CP English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackTrust"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallbackTrust"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackTrust English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallbackTrust English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback PB"},"after_threshold_behavior":{"S":"QUEUE"}}' 2>/dev/null && echo "  ✅ VHCallback PB"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback PB Eng"},"after_threshold_behavior":{"S":"QUEUE"}}' 2>/dev/null && echo "  ✅ VHCallback PB Eng"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Prem"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Prem"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Prem English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback Prem English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackPAuto"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallbackPAuto"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackPAuto English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallbackPAuto English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback ATHM"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback ATHM"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback ATHM English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback ATHM English"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback MiBa"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback MiBa"
aws dynamodb put-item --table-name QueueGroupInfo --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback MiBa English"},"after_threshold_behavior":{"S":"CALLBACK"}}' 2>/dev/null && echo "  ✅ VHCallback MiBa English"


# =============================================================================
# CallsInSystem — datos mock (callbacks en distintos estados)
# PK: contact_id_inbound
# =============================================================================
echo ""
echo "📞 CallsInSystem (callbacks mock en distintos estados)..."

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-001-pending"},"status":{"S":"PENDING"},"call_at":{"S":"2025-05-28T09:30:00Z"},"customer_phone_number":{"S":"+17875551001"},"queue_name":{"S":"VHCallback Cust"},"queue_id":{"S":"b604decc-6126-4359-97e6-400162d5791d"},"retries":{"N":"0"},"callback_type":{"S":"ASAP"},"outbound_phone_number":{"S":"+17877243650"},"retry_attempt_interval":{"N":"300"},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T09:30:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-001 PENDING"

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-002-progress"},"status":{"S":"IN_PROGRESS"},"call_at":{"S":"2025-05-28T10:00:00Z"},"customer_phone_number":{"S":"+17875551002"},"queue_name":{"S":"VHCallback Sale"},"queue_id":{"S":"c211aaf7-e4ab-4fc6-b791-a1828432acdf"},"retries":{"N":"1"},"callback_type":{"S":"SCHEDULED"},"outbound_phone_number":{"S":"+17877243655"},"retry_attempt_interval":{"N":"300"},"contact_id_outbound":{"S":"out-002"},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T09:45:00Z"},"CB_RETRY_1":{"S":"2025-05-28T10:00:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-002 IN_PROGRESS"

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-003-completed"},"status":{"S":"COMPLETED"},"call_at":{"S":"2025-05-28T08:15:00Z"},"customer_phone_number":{"S":"+17875551003"},"queue_name":{"S":"VH Callback CP"},"queue_id":{"S":"0bc06cbd-0895-4f18-ba64-c961dd72e413"},"retries":{"N":"0"},"callback_type":{"S":"ASAP"},"outbound_phone_number":{"S":"+17877580505"},"retry_attempt_interval":{"N":"300"},"contact_id_outbound":{"S":"out-003"},"agent_name":{"S":"Maria Rodriguez"},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T08:10:00Z"},"COMPLETED":{"S":"2025-05-28T08:15:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-003 COMPLETED"

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-004-failed"},"status":{"S":"FAILED"},"call_at":{"S":"2025-05-28T07:30:00Z"},"customer_phone_number":{"S":"+17875551004"},"queue_name":{"S":"VHCallback MiBa"},"queue_id":{"S":"546358d3-9708-48f9-a3dd-e7a07f3ffba7"},"retries":{"N":"3"},"callback_type":{"S":"ASAP"},"outbound_phone_number":{"S":"+17877243655"},"retry_attempt_interval":{"N":"300"},"stop_on_voicemail":{"BOOL":true},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T07:00:00Z"},"CB_RETRY_1":{"S":"2025-05-28T07:05:00Z"},"CB_RETRY_2":{"S":"2025-05-28T07:10:00Z"},"CB_RETRY_3":{"S":"2025-05-28T07:15:00Z"},"FAILED":{"S":"2025-05-28T07:30:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-004 FAILED"

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-005-scheduled"},"status":{"S":"PENDING"},"call_at":{"S":"2025-05-29T14:00:00Z"},"customer_phone_number":{"S":"+17875551005"},"queue_name":{"S":"VHCallback Prem"},"queue_id":{"S":"191b761d-096e-4c9c-a7a9-307066a26499"},"retries":{"N":"0"},"callback_type":{"S":"SCHEDULED"},"outbound_phone_number":{"S":"+17877243655"},"retry_attempt_interval":{"N":"300"},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T11:00:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-005 PENDING (scheduled tomorrow)"

aws dynamodb put-item --table-name CallsInSystem --endpoint-url $AWS_ENDPOINT_URL --item '{
  "contact_id_inbound":{"S":"abc-006-cancelled"},"status":{"S":"CANCELLED"},"call_at":{"S":"2025-05-28T09:00:00Z"},"customer_phone_number":{"S":"+17875551006"},"queue_name":{"S":"VHCallbackPAuto"},"queue_id":{"S":"5225229f-bc93-4a1f-a0aa-9e7597ae1337"},"retries":{"N":"0"},"callback_type":{"S":"ASAP"},"outbound_phone_number":{"S":"+17877929282"},"retry_attempt_interval":{"N":"300"},"timestamp":{"M":{"CB_REGISTERED":{"S":"2025-05-28T08:50:00Z"},"CANCELLED":{"S":"2025-05-28T09:00:00Z"}}}
}' 2>/dev/null && echo "  ✅ abc-006 CANCELLED"


# =============================================================================
# QueueRegisterStats — datos mock (métricas de registro por queue/fecha)
# PK: queue_name, SK: report_date (nota: tabla actual solo tiene PK queue_name)
# =============================================================================
echo ""
echo "📊 QueueRegisterStats (métricas mock)..."

aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust"},"cust_registered":{"N":"45"},"cust_register_pending":{"N":"8"}}' 2>/dev/null && echo "  ✅ VHCallback Cust"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale"},"cust_registered":{"N":"32"},"cust_register_pending":{"N":"5"}}' 2>/dev/null && echo "  ✅ VHCallback Sale"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VH Callback CP"},"cust_registered":{"N":"28"},"cust_register_pending":{"N":"3"}}' 2>/dev/null && echo "  ✅ VH Callback CP"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback MiBa"},"cust_registered":{"N":"51"},"cust_register_pending":{"N":"12"}}' 2>/dev/null && echo "  ✅ VHCallback MiBa"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback ATHM"},"cust_registered":{"N":"67"},"cust_register_pending":{"N":"15"}}' 2>/dev/null && echo "  ✅ VHCallback ATHM"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Prem"},"cust_registered":{"N":"19"},"cust_register_pending":{"N":"2"}}' 2>/dev/null && echo "  ✅ VHCallback Prem"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackPAuto"},"cust_registered":{"N":"23"},"cust_register_pending":{"N":"4"}}' 2>/dev/null && echo "  ✅ VHCallbackPAuto"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallbackTrust"},"cust_registered":{"N":"14"},"cust_register_pending":{"N":"1"}}' 2>/dev/null && echo "  ✅ VHCallbackTrust"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Come"},"cust_registered":{"N":"38"},"cust_register_pending":{"N":"7"}}' 2>/dev/null && echo "  ✅ VHCallback Come"
aws dynamodb put-item --table-name QueueRegisterStats --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback PB"},"cust_registered":{"N":"11"},"cust_register_pending":{"N":"2"}}' 2>/dev/null && echo "  ✅ VHCallback PB"


# =============================================================================
# CallbackConcurrencyMetrics — datos mock
# PK: queue_name (literal), SK: timestamp
# =============================================================================
echo ""
echo "📈 CallbackConcurrencyMetrics (métricas de concurrencia mock)..."

aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust#2025-05-28"},"timestamp":{"S":"09:00#ASAP"},"concurrent_callbacks":{"N":"3"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Cust 09:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust#2025-05-28"},"timestamp":{"S":"10:00#ASAP"},"concurrent_callbacks":{"N":"5"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Cust 10:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Cust#2025-05-28"},"timestamp":{"S":"11:00#SCHEDULED"},"concurrent_callbacks":{"N":"2"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Cust 11:00 SCHEDULED"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale#2025-05-28"},"timestamp":{"S":"09:00#ASAP"},"concurrent_callbacks":{"N":"4"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Sale 09:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale#2025-05-28"},"timestamp":{"S":"10:00#ASAP"},"concurrent_callbacks":{"N":"5"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Sale 10:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback Sale#2025-05-28"},"timestamp":{"S":"12:00#SCHEDULED"},"concurrent_callbacks":{"N":"3"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ Sale 12:00 SCHEDULED"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VH Callback CP#2025-05-28"},"timestamp":{"S":"09:00#ASAP"},"concurrent_callbacks":{"N":"2"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ CP 09:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VH Callback CP#2025-05-28"},"timestamp":{"S":"14:00#ASAP"},"concurrent_callbacks":{"N":"4"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ CP 14:00 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback ATHM#2025-05-28"},"timestamp":{"S":"08:30#ASAP"},"concurrent_callbacks":{"N":"5"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ ATHM 08:30 ASAP"
aws dynamodb put-item --table-name CallbackConcurrencyMetrics --endpoint-url $AWS_ENDPOINT_URL --item '{"queue_name":{"S":"VHCallback ATHM#2025-05-28"},"timestamp":{"S":"15:00#SCHEDULED"},"concurrent_callbacks":{"N":"1"},"max_concurrent":{"N":"5"}}' 2>/dev/null && echo "  ✅ ATHM 15:00 SCHEDULED"


# =============================================================================
# CallbackReports — datos mock (reportes en distintos estados)
# PK: reportId, GSI: createdByNormalized + createdAt
# =============================================================================
echo ""
echo "📄 CallbackReports (reportes mock)..."

aws dynamodb put-item --table-name CallbackReports --endpoint-url $AWS_ENDPOINT_URL --item '{
  "reportId":{"S":"rpt-001-succeeded"},"createdByNormalized":{"S":"editor@test.com"},"createdAt":{"S":"2025-05-27T10:00:00Z"},"status":{"S":"SUCCEEDED"},"params":{"M":{"start_date":{"S":"2025-05-01"},"end_date":{"S":"2025-05-27"}}},"startedAt":{"S":"2025-05-27T10:00:05Z"},"finishedAt":{"S":"2025-05-27T10:02:30Z"},"resultLocation":{"S":"s3://local-callback-reports/reports/callbacks-by-date/rpt-001.csv"},"totalRowCount":{"N":"1523"}
}' 2>/dev/null && echo "  ✅ rpt-001 SUCCEEDED"

aws dynamodb put-item --table-name CallbackReports --endpoint-url $AWS_ENDPOINT_URL --item '{
  "reportId":{"S":"rpt-002-running"},"createdByNormalized":{"S":"editor@test.com"},"createdAt":{"S":"2025-05-28T08:00:00Z"},"status":{"S":"RUNNING"},"params":{"M":{"start_date":{"S":"2025-05-20"},"end_date":{"S":"2025-05-28"}}},"startedAt":{"S":"2025-05-28T08:00:03Z"}
}' 2>/dev/null && echo "  ✅ rpt-002 RUNNING"

aws dynamodb put-item --table-name CallbackReports --endpoint-url $AWS_ENDPOINT_URL --item '{
  "reportId":{"S":"rpt-003-failed"},"createdByNormalized":{"S":"viewer@test.com"},"createdAt":{"S":"2025-05-26T15:30:00Z"},"status":{"S":"FAILED"},"params":{"M":{"start_date":{"S":"2025-05-01"},"end_date":{"S":"2025-05-26"},"phone_numbers":{"L":[{"S":"+17875551234"}]}}},"startedAt":{"S":"2025-05-26T15:30:02Z"},"finishedAt":{"S":"2025-05-26T15:31:00Z"},"error":{"S":"Athena query timeout after 60s"}
}' 2>/dev/null && echo "  ✅ rpt-003 FAILED"

# =============================================================================
# SSM Parameter — Callback Configuration (actualizado con schedule completo)
# =============================================================================
echo ""
echo "🔑 SSM Callback Configuration (config completa)..."

aws ssm put-parameter \
    --name "/bppr-amazon-connect-extensions/LOCAL/callback-configuration" \
    --type "String" \
    --value '{"status":true,"mode":"AUTOMATIC","activation_threshold":10,"deactivation_threshold":5,"priority_mode":"CUSTOMER","schedule_programming":[{"day":"MONDAY","start_at":"08:00","end_at":"18:00","status":true},{"day":"TUESDAY","start_at":"08:00","end_at":"18:00","status":true},{"day":"WEDNESDAY","start_at":"08:00","end_at":"18:00","status":true},{"day":"THURSDAY","start_at":"08:00","end_at":"18:00","status":true},{"day":"FRIDAY","start_at":"08:00","end_at":"18:00","status":true},{"day":"SATURDAY","start_at":"09:00","end_at":"16:00","status":true},{"day":"SUNDAY","start_at":"09:00","end_at":"16:00","status":false}]}' \
    --overwrite \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ callback-configuration (full schedule)" || echo "  ⚠️  callback-configuration (error)"

# =============================================================================
echo ""
echo "🎉 Seed de datos reales completado!"
echo ""
echo "Resumen de tablas pobladas:"
echo "  - QueueConfiguration: 20 queues reales (del CSV)"
echo "  - QueueGroupInfo: 20 grupos (inferidos de associations)"
echo "  - CallsInSystem: 6 callbacks mock (distintos estados)"
echo "  - QueueRegisterStats: 10 registros mock"
echo "  - CallbackConcurrencyMetrics: 10 métricas mock"
echo "  - CallbackReports: 3 reportes mock"
echo "  - SSM: callback-configuration con schedule completo"
echo ""
echo "Tablas ya pobladas por seed-floci.sh:"
echo "  - UserAcl: editor@test.com + viewer@test.com"
echo ""
echo "Para feriados de PR ejecutar: bash seed-holidays-pr.sh"
