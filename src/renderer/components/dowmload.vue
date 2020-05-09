<template>
    <div id="dowmload" v-if="dowmloadShow" @click="dowmloadBox" :style="{top: client.top,left:client.left}">
        <div class="dowmload_top">
            <div class="header_left">
                下载管理
            </div>
            <div class="header_right">
                <img src="../assets/images/clear.png" alt="">
            </div>
        </div>

        <div class="dowmload_content">
            <div class="dowmload_content_item" v-for="(item,index) in dowmload_data" :key='index' @mouseover="dataOver(index)" @mouseleave="dataOut(index)" :style="{backgroundColor:(item.overMouse?'#F3F8FD':'')}">
                <div class="content_left">
                    <div v-if="item.progressShow">
                        <Circle :percent="item.percent" :stroke-color="color" :stroke-width="10" :trail-width="8" :size="60">
                            <img :src="item.icon" alt="">
                        </Circle>
                    </div>
                    <div v-else>
                        <img :src="item.icon" alt="">
                    </div>
                </div>
                <div class="content_right">
                    <div class="content_right_title">{{item.filename}}</div>
                    <div class="content_right_link">{{item.url}}</div>
                    <div class="content_right_info" v-if="!item.overMouse">
                        <div class="content_right_info_size">{{item.totalBytes}}</div>
                        <div class="content_right_info_time">{{item.startTime}}</div>
                    </div>
                    <div class="content_right_info_hover" v-else-if="item.overMouse">
                        <img src="../assets/images/file.png" alt="">
                        <img src="../assets/images/refresh.png" alt="">
                        <img src="../assets/images/delete.png" alt="">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        props:{
            dowmloadShow:{
                type: Boolean,
                default: false   
            },
            client:{
                type: Object
            },
            dowmload_data:{
                type: Array,
                default: ()=>{
                    return []
                }
            }
        },
        data() {
            return {
                color: '#2db7f5',
            }
        },
        methods: {
            dowmloadBox:function(e){
                e.stopPropagation();
            },
            dataOver:function(index){
                for(let ind in this.dowmload_data){
                    this.dowmload_data[ind].overMouse = false;
                }
                this.dowmload_data[index].overMouse = true;
            },
            dataOut:function(index){
                this.dowmload_data[index].overMouse = false;
            }
        },
    }
</script>

<style scoped>
    #dowmload{
        width: 450px;
        height: 550px;
        background: #FDFDFD;
        position: fixed;
        box-shadow:0px 0px 3px 2px rgba(240,241,245,1);
    }
    /* 头部 */
    .dowmload_top{
        height: 50px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        background: #FFFFFF;
        box-shadow:0px 3px 5px 0px rgba(240,241,245,1);
    }
    .header_left{
        font-size: 24px;
        color: #000000;
    }
    .header_right{

    }
    .header_right img{
        width: 22px;
        height: 22px;
    }

    /* 内容 */
    .dowmload_content{
        height: calc(100% - 50px);
        overflow-y: auto;
    }
    .dowmload_content .dowmload_content_item{
        padding: 15px 10px 20px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #E6E6E6;
        cursor: pointer;
    }
    .dowmload_content .dowmload_content_item:last-of-type{
        border-bottom: none;
    }
    .dowmload_content .dowmload_content_item .content_left{
        padding-right: 20px;
    }
    .dowmload_content .dowmload_content_item .content_left>div{
        width: 60px;
        height: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .dowmload_content .dowmload_content_item .content_left>div img{
        width: 30px;
        height: 30px;
    }
    .dowmload_content .dowmload_content_item .content_right{
        width: calc(100% - 100px);
        display: flex;
        flex-direction: column;
        color: #B0B4C3;
        font-size: 16px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_title{
        overflow: hidden;
        text-overflow:ellipsis;
        white-space: nowrap;
        color: #3E3E3E;
        width: 100%;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_link{
        margin: 10px 0;
        overflow: hidden;
        text-overflow:ellipsis;
        white-space: nowrap;
        width: 100%;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info{
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 20px;
        font-size: 14px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info_hover{
        height: 20px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info_hover img{
        width: 20px;
        height: 20px;
        margin-right: 15px;
    }
</style>