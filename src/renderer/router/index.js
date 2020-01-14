import Vue from 'vue'
import Router from 'vue-router'

import index from '@/components/Index'

const routerPush = Router.prototype.push
Router.prototype.push = function push(location) {
  return routerPush.call(this, location).catch(error=> error)
}
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'index',
      component: index
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
