import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '酒店供应链商机互助平台 API',
      version: '1.0.0',
      description: 'H5用户端 + Web管理后台 完整API文档',
    },
    servers: [
      { url: 'http://localhost:3001', description: '本地开发环境' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            phone: { type: 'string', example: '13800000001' },
            nickname: { type: 'string', example: '测试用户1' },
            level: { type: 'string', example: 'normal' },
            creditScore: { type: 'integer', example: 100 },
            pointsBalance: { type: 'integer', example: 200 },
            inviteCode: { type: 'string', example: 'IOMJAYI7' },
          },
        },
        Opportunity: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            hotelName: { type: 'string' },
            city: { type: 'string' },
            price: { type: 'integer' },
            status: { type: 'string', enum: ['active', 'inactive', 'invalid'] },
            purchaseCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            opportunityId: { type: 'integer' },
            buyerId: { type: 'integer' },
            sellerId: { type: 'integer' },
            actualPrice: { type: 'number' },
            platformCommission: { type: 'number' },
            sellerIncome: { type: 'number' },
            status: { type: 'string', enum: ['paid', 'refunded'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            message: { type: 'string', example: 'success' },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: '认证', description: '登录/注册/重置密码' },
      { name: '商机', description: '商机CRUD、列表、详情' },
      { name: '订单', description: '购买商机、订单管理' },
      { name: '积分', description: '积分账户、积分流水、充值' },
      { name: 'CRM', description: '个人跟进库管理' },
      { name: '跟进', description: '跟进记录管理' },
      { name: '邀请', description: '邀请码与记录' },
      { name: '排行榜', description: '购买/有用排行榜' },
      { name: '统计', description: '个人数据统计' },
      { name: 'Banner', description: '首页轮播Banner' },
      { name: '提醒', description: 'CRM提醒中心' },
      { name: '信用', description: '信用分记录' },
      { name: '后台-商机管理', description: '管理商机上下架、导入' },
      { name: '后台-订单管理', description: '管理订单' },
      { name: '后台-用户管理', description: '用户管理与积分/信用调整' },
      { name: '后台-积分管理', description: '积分流水' },
      { name: '后台-等级配置', description: '会员等级规则配置' },
      { name: '后台-系统配置', description: '系统参数配置' },
      { name: '后台-审核', description: '进度分享审核' },
      { name: '后台-Banner', description: 'Banner CRUD' },
      { name: '后台-通知', description: '系统通知推送' },
      { name: '后台-统计', description: '数据统计看板' },
      { name: '后台-角色', description: '角色与权限管理' },
      { name: '后台-日志', description: '操作审计日志' },
    ],
  },
  apis: ['./routes/**/*.js', './routes/admin/*.js'],
};

export default swaggerJsdoc(options);