export const crmTools = [
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_delete__agencyWorkerId',
    description: 'Call DELETE /:agencyWorkerId on crm',
    inputSchema: {"type": "object", "properties": {"agencyWorkerId": {"type": "string", "description": "Path variable: agencyWorkerId"}}, "required": ["agencyWorkerId"]},
  },
  {
    name: 'crm_patch__agencyWorkerId_reactivate',
    description: 'Call PATCH /:agencyWorkerId/reactivate on crm',
    inputSchema: {"type": "object", "properties": {"agencyWorkerId": {"type": "string", "description": "Path variable: agencyWorkerId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["agencyWorkerId", "body"]},
  },
  {
    name: 'crm_post__agencyWorkerId_assign_user',
    description: 'Call POST /:agencyWorkerId/assign-user on crm',
    inputSchema: {"type": "object", "properties": {"agencyWorkerId": {"type": "string", "description": "Path variable: agencyWorkerId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["agencyWorkerId", "body"]},
  },
  {
    name: 'crm_post__agencyWorkerId_release',
    description: 'Call POST /:agencyWorkerId/release on crm',
    inputSchema: {"type": "object", "properties": {"agencyWorkerId": {"type": "string", "description": "Path variable: agencyWorkerId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["agencyWorkerId", "body"]},
  },
  {
    name: 'crm_post__chat',
    description: 'Call POST /chat on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__history',
    description: 'Call GET /history on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_delete__history',
    description: 'Call DELETE /history on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__revenue',
    description: 'Call GET /revenue on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__state',
    description: 'Call GET /state on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__listings',
    description: 'Call POST /listings on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__listings_purchase',
    description: 'Call POST /listings/purchase on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__withdrawals',
    description: 'Call POST /withdrawals on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__trades_release',
    description: 'Call POST /trades/release on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__trades_dispute',
    description: 'Call POST /trades/dispute on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__listings_approve',
    description: 'Call POST /listings/approve on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__trades_dispute_resolve',
    description: 'Call POST /trades/dispute/resolve on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__withdrawals_approve',
    description: 'Call POST /withdrawals/approve on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__listings',
    description: 'Call GET /listings on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__trades',
    description: 'Call GET /trades on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__withdrawals',
    description: 'Call GET /withdrawals on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__tools',
    description: 'Call GET /tools on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__tools_call',
    description: 'Call POST /tools/call on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__stream',
    description: 'Call GET /stream on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__unread_count',
    description: 'Call GET /unread-count on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_patch__read_all',
    description: 'Call PATCH /read-all on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_patch__notificationId_read',
    description: 'Call PATCH /:notificationId/read on crm',
    inputSchema: {"type": "object", "properties": {"notificationId": {"type": "string", "description": "Path variable: notificationId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["notificationId", "body"]},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_put__permissionId',
    description: 'Call PUT /:permissionId on crm',
    inputSchema: {"type": "object", "properties": {"permissionId": {"type": "string", "description": "Path variable: permissionId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["permissionId", "body"]},
  },
  {
    name: 'crm_delete__permissionId',
    description: 'Call DELETE /:permissionId on crm',
    inputSchema: {"type": "object", "properties": {"permissionId": {"type": "string", "description": "Path variable: permissionId"}}, "required": ["permissionId"]},
  },
  {
    name: 'crm_post__check',
    description: 'Call POST /check on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__check_all',
    description: 'Call POST /check-all on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__check_any',
    description: 'Call POST /check-any on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__me',
    description: 'Call GET /me on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__user_userId',
    description: 'Call GET /user/:userId on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_post__user_userId_override',
    description: 'Call POST /user/:userId/override on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["userId", "body"]},
  },
  {
    name: 'crm_patch__user_userId_overrides',
    description: 'Call PATCH /user/:userId/overrides on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["userId", "body"]},
  },
  {
    name: 'crm_delete__user_userId_override',
    description: 'Call DELETE /user/:userId/override on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__transfer',
    description: 'Call POST /transfer on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_delete__id',
    description: 'Call DELETE /:id on crm',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'crm_get__settings',
    description: 'Call GET /settings on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_put__settings',
    description: 'Call PUT /settings on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__eligible_users',
    description: 'Call GET /eligible-users on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__promotionId',
    description: 'Call GET /:promotionId on crm',
    inputSchema: {"type": "object", "properties": {"promotionId": {"type": "string", "description": "Path variable: promotionId"}}, "required": ["promotionId"]},
  },
  {
    name: 'crm_put__promotionId',
    description: 'Call PUT /:promotionId on crm',
    inputSchema: {"type": "object", "properties": {"promotionId": {"type": "string", "description": "Path variable: promotionId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["promotionId", "body"]},
  },
  {
    name: 'crm_delete__promotionId',
    description: 'Call DELETE /:promotionId on crm',
    inputSchema: {"type": "object", "properties": {"promotionId": {"type": "string", "description": "Path variable: promotionId"}}, "required": ["promotionId"]},
  },
  {
    name: 'crm_post__promotionId_execute',
    description: 'Call POST /:promotionId/execute on crm',
    inputSchema: {"type": "object", "properties": {"promotionId": {"type": "string", "description": "Path variable: promotionId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["promotionId", "body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__purchase',
    description: 'Call POST /purchase on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_patch__servicePackageId',
    description: 'Call PATCH /:servicePackageId on crm',
    inputSchema: {"type": "object", "properties": {"servicePackageId": {"type": "string", "description": "Path variable: servicePackageId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["servicePackageId", "body"]},
  },
  {
    name: 'crm_delete__servicePackageId',
    description: 'Call DELETE /:servicePackageId on crm',
    inputSchema: {"type": "object", "properties": {"servicePackageId": {"type": "string", "description": "Path variable: servicePackageId"}}, "required": ["servicePackageId"]},
  },
  {
    name: 'crm_get__purchases',
    description: 'Call GET /purchases on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__license_keys',
    description: 'Call GET /license-keys on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__license_keys_keyId_renew',
    description: 'Call POST /license-keys/:keyId/renew on crm',
    inputSchema: {"type": "object", "properties": {"keyId": {"type": "string", "description": "Path variable: keyId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["keyId", "body"]},
  },
  {
    name: 'crm_get__license_keys_system',
    description: 'Call GET /license-keys/system on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__license_keys_system_keyId_renew',
    description: 'Call POST /license-keys/system/:keyId/renew on crm',
    inputSchema: {"type": "object", "properties": {"keyId": {"type": "string", "description": "Path variable: keyId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["keyId", "body"]},
  },
  {
    name: 'crm_delete__license_keys_system_keyId',
    description: 'Call DELETE /license-keys/system/:keyId on crm',
    inputSchema: {"type": "object", "properties": {"keyId": {"type": "string", "description": "Path variable: keyId"}}, "required": ["keyId"]},
  },
  {
    name: 'crm_get__qr_code',
    description: 'Call GET /qr-code on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__qr_code',
    description: 'Call POST /qr-code on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__guest',
    description: 'Call POST /guest on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__guest',
    description: 'Call GET /guest on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__ai',
    description: 'Call POST /ai on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__strategic_direction',
    description: 'Call GET /strategic-direction on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__strategic_direction',
    description: 'Call POST /strategic-direction on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__market_profile',
    description: 'Call GET /market-profile on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__market_profile',
    description: 'Call POST /market-profile on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__action_plan',
    description: 'Call GET /action-plan on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__action_plan',
    description: 'Call POST /action-plan on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__features',
    description: 'Call GET /features on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__features',
    description: 'Call POST /features on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__matrix',
    description: 'Call GET /matrix on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__matrix',
    description: 'Call POST /matrix on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__factory',
    description: 'Call GET /factory on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__factory',
    description: 'Call POST /factory on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__seeding',
    description: 'Call GET /seeding on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__seeding',
    description: 'Call POST /seeding on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__content_engine',
    description: 'Call GET /content-engine on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__content_engine',
    description: 'Call POST /content-engine on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__social_amplification',
    description: 'Call GET /social-amplification on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__social_amplification',
    description: 'Call POST /social-amplification on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__conversion_gateway',
    description: 'Call GET /conversion-gateway on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__conversion_gateway',
    description: 'Call POST /conversion-gateway on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__pipeline_engine',
    description: 'Call GET /pipeline-engine on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__pipeline_engine',
    description: 'Call POST /pipeline-engine on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__loyalty_loop',
    description: 'Call GET /loyalty-loop on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__loyalty_loop',
    description: 'Call POST /loyalty-loop on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__content_network',
    description: 'Call GET /content-network on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__content_network',
    description: 'Call POST /content-network on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__feedback',
    description: 'Call POST /feedback on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__session_history',
    description: 'Call GET /session-history on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__claim_guest',
    description: 'Call POST /claim-guest on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__stream',
    description: 'Call GET /stream on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__submit',
    description: 'Call POST /submit on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__me',
    description: 'Call GET /me on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__credits_balance',
    description: 'Call GET /credits/balance on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__credits_ledger',
    description: 'Call GET /credits/ledger on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__credits_deduct',
    description: 'Call POST /credits/deduct on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__credits_internal_deduct',
    description: 'Call POST /credits/internal/deduct on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__credits_internal_refund',
    description: 'Call POST /credits/internal/refund on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__topupId',
    description: 'Call GET /:topupId on crm',
    inputSchema: {"type": "object", "properties": {"topupId": {"type": "string", "description": "Path variable: topupId"}}, "required": ["topupId"]},
  },
  {
    name: 'crm_post__topupId_approve',
    description: 'Call POST /:topupId/approve on crm',
    inputSchema: {"type": "object", "properties": {"topupId": {"type": "string", "description": "Path variable: topupId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["topupId", "body"]},
  },
  {
    name: 'crm_post__topupId_reject',
    description: 'Call POST /:topupId/reject on crm',
    inputSchema: {"type": "object", "properties": {"topupId": {"type": "string", "description": "Path variable: topupId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["topupId", "body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__by_worker',
    description: 'Call GET /by-worker on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__me',
    description: 'Call GET /me on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_put__me',
    description: 'Call PUT /me on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__stats',
    description: 'Call GET /stats on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__customer_stats',
    description: 'Call GET /customer-stats on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__userId',
    description: 'Call GET /:userId on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_patch__userId',
    description: 'Call PATCH /:userId on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["userId", "body"]},
  },
  {
    name: 'crm_delete__userId',
    description: 'Call DELETE /:userId on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_get__userId_summary',
    description: 'Call GET /:userId/summary on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_get__userId_insight',
    description: 'Call GET /:userId/insight on crm',
    inputSchema: {"type": "object", "properties": {"userId": {"type": "string", "description": "Path variable: userId"}}, "required": ["userId"]},
  },
  {
    name: 'crm_post__verify',
    description: 'Call POST /verify on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__refresh',
    description: 'Call POST /refresh on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__admin_telegram_login',
    description: 'Call POST /admin-telegram-login on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_post__',
    description: 'Call POST / on crm',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'crm_get__',
    description: 'Call GET / on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__stats',
    description: 'Call GET /stats on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__active',
    description: 'Call GET /active on crm',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'crm_get__workerId',
    description: 'Call GET /:workerId on crm',
    inputSchema: {"type": "object", "properties": {"workerId": {"type": "string", "description": "Path variable: workerId"}}, "required": ["workerId"]},
  },
  {
    name: 'crm_put__workerId',
    description: 'Call PUT /:workerId on crm',
    inputSchema: {"type": "object", "properties": {"workerId": {"type": "string", "description": "Path variable: workerId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["workerId", "body"]},
  },
  {
    name: 'crm_delete__workerId',
    description: 'Call DELETE /:workerId on crm',
    inputSchema: {"type": "object", "properties": {"workerId": {"type": "string", "description": "Path variable: workerId"}}, "required": ["workerId"]},
  },
  {
    name: 'crm_patch__workerId_reactivate',
    description: 'Call PATCH /:workerId/reactivate on crm',
    inputSchema: {"type": "object", "properties": {"workerId": {"type": "string", "description": "Path variable: workerId"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["workerId", "body"]},
  },
];
