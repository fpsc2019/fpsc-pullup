import React, {Component} from 'react';
import {
    Layout,
    Skeleton,
    Descriptions,
    Divider,
    notification,
    List,
    Tag,
    Avatar,
    Row,
    Col,
    Statistic,
    Button,
    Modal,
    ConfigProvider,
    Radio,
    Input,
    Rate,
    message, Form, InputNumber
} from "antd";
import {WaterWave, Pie} from 'ant-design-pro/lib/Charts';
import 'ant-design-pro/dist/ant-design-pro.css';
import SelectAccount from "./component/SelectAccount"
import Axios from "./server";
import BigNumber from "bignumber.js"
import serojs from "serojs"
import Pullup from "pullup-js-sdk"

import "./App.css"
import copy from "copy-text-to-clipboard";
import QRCode from "qrcode";
import logo from "./logo.png"
import enUS from 'antd/es/locale/en_US';
import zhCN from 'antd/es/locale/zh_CN';
import Language from "./Lang"
import identicon from "identicon.js"
import Contract from "./component/contract"

let ct = new Contract();
let Lang = new Language();
const {Header, Content, Footer} = Layout;

let ajax = new Axios();
let contractAddress = ct.address;
let ABI = ct.abi;

let contract = serojs.callContract(ABI, contractAddress);

let decimal = new BigNumber(10).pow(18);
const {Countdown} = Statistic;

var pullup = new Pullup();
pullup.setProvider(new pullup.providers.HttpProvider('http://127.0.0.1:2345'));

const openNotificationWithIcon = (type, message, desc) => {
    notification[type]({
        message: message,
        description: <p style={{wordBreak: 'normal', whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>{desc}</p>,
        duration: null,
    });
};


const InvestForm = Form.create({name: 'form_in_modal2'})(
    class extends React.Component {

        state = {
            confirmLoading: false,
            estimateReturn: 0,
            estimateLevel: 0,
            amount: 0.000000,
            total: 0.000000
        }

        staticTotal() {
            let that = this;
            setTimeout(function () {
                let total = new BigNumber(that.state.amount);
                let totalAmount=total.plus(that.props.totalAmount)

                let estimateLevel = 0;
                if(parseFloat(total)<100) {
                } else if (parseFloat(totalAmount) >= 100 && parseFloat(totalAmount) < 12500) {
                    estimateLevel = 3
                } else if (parseFloat(totalAmount) >= 12500 && parseFloat(totalAmount) < 25000) {
                    estimateLevel = 4
                } else if (parseFloat(totalAmount) >= 25000) {
                    estimateLevel = 5
                }

                that.setState({
                    total: total.toFixed(6),
                    estimateLevel: estimateLevel
                })
            }, 10)
        }

        render() {
            const {visible, sero, onCancel, onCreate, form, referId} = this.props;
            const {getFieldDecorator, setFieldsValue} = form;

            setTimeout(function () {
                if (referId && referId !== 0) {
                    setFieldsValue({"ReferId": referId});
                }
            }, 100)

            let that = this;
            return (
                <Modal
                    visible={visible}
                    title={Lang[that.props.lang].account.modal.invest.title}
                    onCancel={onCancel}
                    onOk={() => {
                        this.setState({
                            confirmLoading: true
                        });
                        setTimeout(function () {
                            onCreate(function (res) {
                                that.setState({
                                    confirmLoading: res
                                });
                            });
                        },10)
                    }}
                    confirmLoading={this.state.confirmLoading}
                >
                    <Form layout="vertical">
                        <Form.Item label={Lang[that.props.lang].account.modal.invest.referId}>
                            {getFieldDecorator(`ReferId`, {
                                rules: [{required: true, message: `Please Input Refer Id`}],
                            })(<Input style={{width: '30%'}} disabled={!(!referId || referId === 0)}
                                      placeholder={referId ? referId : ""} autoComplete="off"/>)}
                        </Form.Item>
                        <Form.Item
                            label={`${Lang[that.props.lang].account.modal.invest.amount} (Available Balance: ${sero} HAPY)`}>
                            {getFieldDecorator('AmountSero', {
                                rules: [{required: true, message: `Please Input Amount! `}],
                            })(<InputNumber min={0} precision={6} max={parseFloat(sero)} step={100}
                                            style={{width: '30%'}} onChange={(v) => {
                                that.setState({amount: v});
                                that.staticTotal();
                            }} allowClear placeholder="0.000000" autoComplete="off"/>)} HAPY
                            ({Lang[that.props.lang].account.modal.invest.amountTips})
                        </Form.Item>
                        <p>{Lang[that.props.lang].account.modal.invest.estimate}: <span
                            style={{color: '#1DA57A'}}>{that.state.amount}</span> (HAPY) x <span
                            style={{color: '#1DA57A'}}>{that.state.estimateLevel} </span>(Times) = <strong
                            style={{color: 'rgb(216, 0, 38)'}}>{new BigNumber(that.state.amount).multipliedBy(that.state.estimateLevel).toFixed(6)} </strong>HAPY
                        </p>

                        <p>{Lang[that.props.lang].account.modal.invest.total} : <strong
                            style={{color: 'rgb(216, 0, 38)'}}>{this.state.total}</strong> HAPY </p>
                    </Form>
                </Modal>
            );
        }
    },
);

class ContentPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            showAccountSelect: false,
            showDeposit: false,
            showInvest: false,
            showShareProfit: false,
            showWithdraw: false,

            modal1Visible: false,

            currentAccount: {},
            balanceSero: 0,
            ct_balance_sero: 0,
            ct_balanceOfSero: 0,

            ct_rate: 0,
            ct_id: 0,
            ct_details: {},

            lang: "zh_CN",
        }
    }

    componentWillMount() {
        let lang = localStorage.getItem("lang");
        if (!lang) {
            lang = "zh_CN";
            localStorage.setItem("lang", "zh_CN");
        }
        this.setState({
            lang: lang,
        })
    }

    componentDidMount() {
        let that = this;
        setTimeout(function () {
            that.showSelectAccount();
        }, 300);
        if (!this.state.showAccountSelect) {
            setTimeout(function () {
                that.getDetail();
                that.getContractBalance();
                that.getContractSeroBalance();

            }, 310)
        }

        setInterval(function () {
            that.getDetail();
            that.getContractBalance();
            that.getContractSeroBalance();
            if (that.state.currentAccount.PK) {
                that.getAccount(that.state.currentAccount.PK)
            }
        }, 30000)
    }

    showSelectAccount() {

        if (!this.state.currentAccount.PK) {
            let pk = localStorage.getItem("accountPk");
            if (pk) {
                this.getAccount(pk)
                this.setState({
                    loading: false
                })
            } else {
                this.setState({
                    showAccountSelect: true
                })
            }
        }
    }

    showDeposit() {

        this.setState({
            showDeposit: true
        })

        let canvas = document.getElementById('qrImg')
        QRCode.toCanvas(canvas, this.state.currentAccount.MainPKr, function (error) {
            if (error) console.error(error)
            console.log('success!');
        })
    }

    selectAccount = ac => {
        this.setState({
            currentAccount: ac,
            showAccountSelect: false,
            loading: false
        });
        localStorage.setItem("accountPk", ac.PK);
        window.location.reload();

    }

    hiddenAccount = () => {
        this.setState({
            showAccountSelect: false,
        });
    }

    onChange = checked => {
        this.setState({loading: !checked});
    };

    getContractBalance() {
        let that = this;
        ajax.postSeroRpc("sero_getBalance", [contractAddress, "latest"], function (res) {
            let sero = new BigNumber(res.result.tkn.HAPY ? res.result.tkn.HAPY : "0", 16).dividedBy(decimal).toFixed(6);
            that.setState({
                ct_balance_sero: sero,
            })
        })
    }

    getContractSeroBalance() {
        let that = this;
        that.callMethod("balanceOfHAPY", [], function (res) {
            if (res) {
                that.setState({
                    ct_balanceOfSero: new BigNumber(res, 10).dividedBy(decimal).toFixed(6),
                })
            }
        })
    }

    //pullup
    getAccount(pk) {
        let that = this;
        let currentAccount = pullup.local.accountDetail(pk);
        let strMap = new Map();
        let balanceSero = 0;
        let balanceObj = currentAccount.Balance;
        for (var currency of Object.keys(balanceObj)) {
            strMap.set(currency, balanceObj[currency]);
            if (currency === 'HAPY') {
                balanceSero = new BigNumber(balanceObj[currency]).dividedBy(decimal).toFixed(6);
            }
        }
        let data = new identicon(pk, 200).toString();
        currentAccount["avatar"] = "data:image/png;base64," + data;
        that.setState({
            currentAccount: currentAccount,
            balanceSero: balanceSero,
        });
    }


    //=== contract

    getDetail() {
        let that = this;
        let res = that.callMethod("details", []);
        console.log("res:",res);
        let detail = {
            referId: "",
            largeAreaId: "",
            largeAreaTotal: new BigNumber("0").dividedBy(decimal).toFixed(6),
            amount: new BigNumber("0").dividedBy(decimal).toFixed(6),
            returnAmount: new BigNumber("0").dividedBy(decimal).toFixed(6),
            achievement: new BigNumber("0").dividedBy(decimal).toFixed(6),
            recommendNum: parseInt(new BigNumber("0").toString(10)),
            profitLevel: parseInt(new BigNumber("0").toString(10)),
            value: new BigNumber("0").dividedBy(decimal).toFixed(6),
            star: parseInt(new BigNumber("0").toString(10)),
            isKing: false,
        }
        if (res!=="0x0"){
            let data = res;
            if(data){
                detail = {
                    referId: data[0] == 'JFVVW2ITNSJHF' ? "" : data[0],
                    largeAreaId: data[1] == 'JFVVW2ITNSJHF' ? "" : data[1],
                    largeAreaTotal: new BigNumber(data[2]).dividedBy(decimal).toFixed(6),
                    amount: new BigNumber(data[3]).dividedBy(decimal).toFixed(6),
                    returnAmount: new BigNumber(data[4]).dividedBy(decimal).toFixed(6),
                    achievement: new BigNumber(data[5]).dividedBy(decimal).toFixed(6),
                    recommendNum: parseInt(new BigNumber(data[6]).toString(10)),
                    profitLevel: parseInt(new BigNumber(data[7]).toString(10)),
                    value: new BigNumber(data[8]).dividedBy(decimal).toFixed(6),
                    star: parseInt(new BigNumber(data[9]).toString(10)),
                    isKing: data[10],
                }
            }
        }

        let id = that.callMethod("id", []);
        console.log("id:",id);
        detail["id"] = (id == "JFVVW2ITNSJHF" ? "" : id);

        let detailsOfIncome = that.callMethod("detailsOfIncome", []);
        detail["detailsOfIncome"] = detailsOfIncome;

        console.log("detailsOfIncome:",detailsOfIncome)

        let calcuStaticProfit = that.callMethod("calcuStaticProfit", []);
        detail["dayProfit"] = new BigNumber(calcuStaticProfit).dividedBy(decimal).toFixed(6);

        that.setState({
            ct_details: detail
        })
    }

    callMethod(_method, args, callback) {
        let that = this;
        // let param = [ABI, contractAddress, _method, args]

        let packData = contract.packData(_method, args);
        let callParams = {
            from: that.state.currentAccount.MainPKr,
            to: contractAddress,
            data: packData
        }
        let callData = pullup.sero.call(callParams, "latest");
        if(callData !== "0x"){
            let res = contract.unPackData(_method, callData);
            if (callback){
                callback(res);
            }else{
                return res
            }
        }else{
            return "0x0"
        }
    }

    executeMethod(_method, args, value, cy, password, callback) {
        let that = this;

        let packData = contract.packData(_method, args);
        let executeData = {
            from: that.state.currentAccount.PK,
            to: contractAddress,
            value: "0x"+value,//HAPY
            data: packData,
            gas_price: "0x"+new BigNumber("1000000000").toString(16),
            cy:cy,
        };
        let estimateParam = {
            from: that.state.currentAccount.MainPKr,
            to: contractAddress,
            value: "0x"+value,//HAPY
            data: packData,
            gas_price: "0x"+new BigNumber("1000000000").toString(16),
            cy:cy,
        }
        executeData["gas"] = pullup.sero.estimateGas(estimateParam);

        let res = pullup.local.executeContract(executeData)
        if (callback) {
            callback(res)
        }
    }


    handleCancel = () => {
        this.setState({
            showDeposit: false
        })
    }

    //====  buyAsnow begin
    //====  buyAsnow end

    //====  Invest begin
    handleInvestCancel = () => {
        this.setState({showInvest: false});
    };

    handleInvestCreate = (cb) => {
        let that = this;
        const {form} = this.formRef2.props;
        form.validateFields((err, values) => {
            if (err) {
                if (cb) {
                    cb(false)
                }
                return;
            }
            let amountSero = form.getFieldValue("AmountSero");
            let referId = form.getFieldValue("ReferId");
            let password = form.getFieldValue("Password");


            if (that.state.ct_details.referId) {
                referId = that.state.ct_details.referId;
            }
            if (new BigNumber(amountSero).comparedTo(new BigNumber(this.state.balanceSero)) > 0) {
                if (cb) {
                    cb(false)
                }
                message.warn(Lang[that.state.lang].toast.lessAmount);
            }  else if (parseFloat(amountSero) < 100) {
                if (cb) {
                    cb(false)
                }
                message.warn(Lang[that.state.lang].toast.minInvest);
            } else {
                try {
                    this.executeMethod("invest", [referId], new BigNumber(amountSero).multipliedBy(decimal).toString(16), "HAPY", password, function (res) {
                        if (res) {
                            form.resetFields();
                            that.setState({showInvest: false});
                            setTimeout(function () {
                                openNotificationWithIcon('success', 'Successful', `${Lang[that.state.lang].toast.tx}${res}`)
                            }, 3000)
                        }
                        if (cb) {
                            cb(false)
                        }
                    });
                } catch (err) {
                    if (err) {
                        message.error(err.message);
                    } else {
                        message.error("request HAPY Node error:[" + err.message+ "]");
                    }
                    if (cb) {
                        cb(false)
                    }
                }
            }
        });
    };

    calcuPrincipalProfit = (sero, cb) => {
        if (sero) {
            let seroHex = "0x" + new BigNumber(sero).multipliedBy(decimal).toString(16);
            this.callMethod("calcuPrincipalProfit", [seroHex], function (res) {
                if (cb) {
                    cb(res);
                }
            })
        }
    }

    saveInvestFormRef = formRef => {
        this.formRef2 = formRef;
    };

    //====  Invest end

    shareProfit() {
        let that = this;
        try {
            this.executeMethod("triggerStaticProfit", [], "0", "HAPY", '', function (res) {
                if (res) {
                    openNotificationWithIcon('success', 'Successful', `${Lang[that.state.lang].toast.tx}${res}`)
                } else {
                    if (res.error) {
                        message.error(res.error.message);
                    } else {
                        message.error("request HAPY Node error:[" + res + "]");
                    }
                }
            });
        } catch (err) {
            if (err) {
                message.error(err.message);
            } else {
                message.error("request HAPY Node error:[" + err.message+ "]");
            }
        }

    }

    withdraw() {
        let that = this;
        try {
            this.executeMethod("withdrawBalance", [], "0", "HAPY", '', function (res) {
                if (res) {
                    openNotificationWithIcon('success', 'Successful', `${Lang[that.state.lang].toast.tx}${res}`)
                } else {
                    if (res.error) {
                        message.error(res.error.message);
                    } else {
                        message.error("request HAPY Node error:[" + res + "]");
                    }
                }
            });
        } catch (err) {
            if (err) {
                message.error(err.message);
            } else {
                message.error("request HAPY Node error:[" + err.message+ "]");
            }
        }
    }


    //==== Buy Ticket begin

    //==== Buy Ticket end

    render() {
        const {loading, showAccountSelect, currentAccount} = this.state;
        let accountName = currentAccount.PK;
        let that = this;
        let staticReward = that.state.ct_details.detailsOfIncome ? new BigNumber(that.state.ct_details.detailsOfIncome[0]).dividedBy(decimal).toFixed(2) : 0;
        let recommendReward = that.state.ct_details.detailsOfIncome ? new BigNumber(that.state.ct_details.detailsOfIncome[1]).dividedBy(decimal).toFixed(2) : 0;
        let nobilityReward = that.state.ct_details.detailsOfIncome ? new BigNumber(that.state.ct_details.detailsOfIncome[2]).dividedBy(decimal).toFixed(2) : 0;
        let vipReward = that.state.ct_details.detailsOfIncome ? new BigNumber(that.state.ct_details.detailsOfIncome[3]).dividedBy(decimal).toFixed(2) : 0;
        // let currentIncome = that.state.ct_details.detailsOfIncome?new BigNumber(that.state.ct_details.detailsOfIncome[4]).dividedBy(decimal).toFixed(2):0;
        let staticTimestamp = that.state.ct_details.detailsOfIncome ? that.state.ct_details.detailsOfIncome[5] : 0;

        const salesPieData = [
            {
                x: Lang[this.state.lang].account.title.staticReward,
                y: parseFloat(staticReward),
            },
            {
                x: Lang[this.state.lang].account.title.recommendReward,
                y: parseFloat(recommendReward),
            },
            {
                x: Lang[this.state.lang].account.title.nobilityReward,
                y: parseFloat(nobilityReward),
            },
            {
                x: Lang[this.state.lang].account.title.vipReward,
                y: parseFloat(vipReward),
            },

        ];

        const showChart = parseFloat(staticReward) > 0 || parseFloat(recommendReward) > 0 || parseFloat(nobilityReward) > 0 || parseFloat(vipReward) > 0

        const countDown = nextShareTime();
        let totalReturnDay = this.state.ct_balanceOfSero ? new BigNumber(this.state.ct_balanceOfSero).dividedBy(30).toFixed(6) : "0";
        let returnPercent = 0;
        if (this.state.ct_details.returnAmount && parseFloat(this.state.ct_details.returnAmount) > 0) {
            let a = parseFloat(this.state.ct_details.returnAmount);
            let b = new BigNumber(this.state.ct_details.amount).multipliedBy(this.state.ct_details.profitLevel).toString(10);
            returnPercent = (a * 100 / parseFloat(b)).toFixed(2);
        }

        let showCountDown = new Date(staticTimestamp * 1000).getUTCDate() === parseInt(new Date().getUTCDate());
        // test
        //let showCountDown = Math.floor(staticTimestamp /600) === Math.floor(new Date().getTime()/(1000*600));
        return (
            <div className="App" style={{marginTop: '80px'}}>

                <Content style={{padding: '0 50px'}}>
                    <div style={{background: '#fff', width:'100%', padding: 24, minHeight: document.body.clientHeight}}>

                        <div style={{float:'left',width:"40%"}}>
                            <Skeleton loading={loading}>
                                <Descriptions title={<h1>{Lang[this.state.lang].account.title.contract}</h1>}/>


                                <Row style={{textAlign: 'center'}}>


                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.estimatedTotal}
                                                   value={new BigNumber(this.state.ct_details.amount ? this.state.ct_details.amount : 0).multipliedBy(this.state.ct_details.profitLevel ? this.state.ct_details.profitLevel : 0).toFixed(6)}
                                                   precision={6}/>
                                        <Button style={{marginTop: 16}} type="primary" onClick={() => {
                                            this.setState({showInvest: true})
                                        }}>{Lang[this.state.lang].account.button.invest}</Button>
                                    </Col>
                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.totalReturnDay}
                                                   value={totalReturnDay} precision={6}/>
                                    </Col>
                                </Row>
                                <Row style={{textAlign: 'center'}}>

                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.dayIncome}
                                                   value={this.state.ct_details.dayProfit&&parseFloat(totalReturnDay)>0 ? new BigNumber(this.state.ct_details.dayProfit).multipliedBy(100).dividedBy(totalReturnDay).toFixed(2) : "0"}
                                                   suffix={"%"}/>
                                    </Col>

                                </Row>
                                <Row style={{textAlign: 'center'}}>


                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.staticIncome}
                                                   value={this.state.ct_details.dayProfit} precision={6}/>
                                        {
                                            showCountDown ?
                                                <Countdown style={{marginTop: 14}} title="" format="HH:mm:ss"
                                                           value={parseFloat(countDown)} onFinish={() => {
                                                    this.getDetail()
                                                }}/> : <Button style={{marginTop: 16}} type="primary"
                                                               disabled={showCountDown} onClick={() => {
                                                    this.shareProfit()
                                                }}>{Lang[this.state.lang].account.button.trigger}</Button>
                                        }
                                    </Col>
                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.areaTotal}
                                                   value={this.state.ct_details.largeAreaTotal} precision={6}/>
                                    </Col>

                                </Row>
                                <Row style={{textAlign: 'center'}}>
                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.withdraw}
                                                   value={new BigNumber(this.state.ct_details.value ? this.state.ct_details.value : 0).toFixed(6)}
                                                   precision={6}/>
                                        <Button style={{marginTop: 16}} disabled={new BigNumber(this.state.ct_details.value ? this.state.ct_details.value : 0).comparedTo(0) < 1} type="primary" onClick={() => {
                                            this.withdraw()
                                        }}>{Lang[this.state.lang].account.button.withdraw}</Button>
                                    </Col>
                                    <Col span={12}>
                                        <Statistic title={Lang[this.state.lang].account.title.areaOtherTotal}
                                                   value={new BigNumber(this.state.ct_details.achievement).minus(new BigNumber(this.state.ct_details.largeAreaTotal)).toFixed(6)}
                                                   precision={6}/>
                                    </Col>
                                </Row>
                                {
                                    showChart ?
                                        <Row>
                                            <Col span={24} style={{textAlign: 'center'}}>
                                                <div>
                                                    {returnPercent > 0 ? <WaterWave height={234}
                                                                                    title={Lang[this.state.lang].account.title.totalReturn}
                                                                                    percent={returnPercent}/> :
                                                        <WaterWave height={234}
                                                                   title={Lang[this.state.lang].account.title.totalReturn}
                                                                   percent={0}/>}
                                                </div>
                                            </Col>
                                            <Col span={24} style={{textAlign: 'left'}}>
                                                <Pie
                                                    hasLegend
                                                    animate
                                                    title={Lang[this.state.lang].account.title.totalReturn}
                                                    subTitle={Lang[this.state.lang].account.title.totalReturn}
                                                    total={() => (
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: salesPieData.reduce((pre, now) => now.y + pre, 0),
                                                            }}
                                                        />
                                                    )}
                                                    data={salesPieData}
                                                    valueFormat={val => <span
                                                        dangerouslySetInnerHTML={{__html: val}}/>}
                                                    height={248}
                                                />
                                            </Col>
                                        </Row> : ""
                                }
                            </Skeleton>
                        </div>
                        <div style={{float:'left',width:"60%"}}>
                            <List itemLayout="vertical" size="large" rowKey="1">
                                <List.Item>
                                    <Skeleton loading={loading} avatar>
                                        <Descriptions title={<h1>{Lang[this.state.lang].account.title.contract}</h1>}/>
                                        <Descriptions title={
                                            <h1>{Lang[this.state.lang].account.title.utxo} <Button size="small"
                                                                                                   onClick={() => {
                                                                                                       this.setState({
                                                                                                           showAccountSelect: true
                                                                                                       })
                                                                                                   }}>{Lang[this.state.lang].account.title.swith}</Button>
                                            </h1>}/>
                                        <Row>
                                            <Col span={12}>
                                                <List.Item.Meta
                                                    avatar={<p><Avatar shape="square" size={64}
                                                                       src={currentAccount.avatar}/></p>}
                                                    title={
                                                        <small>{accountName ? accountName.substring(0, 30) + "..." : ""}{this.state.ct_details.isKing ?
                                                            <Tag color="gold">VIP</Tag> : ""}</small>}
                                                    description={<Rate count={4}
                                                                       value={this.state.ct_details.star ? this.state.ct_details.star : 0}
                                                                       disabled/>}
                                                />
                                            </Col>
                                            <Col span={12} style={{textAlign:'center'}}>
                                                <Statistic title={Lang[this.state.lang].account.title.balanceSero}
                                                           value={this.state.balanceSero} precision={6}/>
                                                <Button style={{marginTop: 16}} type="primary" onClick={() => {
                                                    this.showDeposit()
                                                }}>{Lang[this.state.lang].account.button.deposit}</Button>
                                            </Col>
                                        </Row>

                                    </Skeleton>
                                </List.Item>


                                <List.Item>
                                    <Skeleton loading={loading}>
                                        <Descriptions title={<h1>{Lang[this.state.lang].project.title}</h1>}>
                                            <Descriptions.Item label={Lang[this.state.lang].project.contractAddress}>
                                                <small>{contractAddress}</small>
                                            </Descriptions.Item>
                                        </Descriptions>

                                        <Row>
                                            <Col span={8}>
                                                <Statistic title={Lang[this.state.lang].project.rate}
                                                           value={this.state.ct_rate} precision={2}
                                                           valueStyle={{color: '#3f8600'}}/>
                                            </Col>
                                        </Row>
                                        <Divider dashed={true}/>
                                        <Descriptions title={Lang[this.state.lang].account.title.investDetail}>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.id}>{this.state.ct_details.id}</Descriptions.Item>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.referId}>{this.state.ct_details.referId}</Descriptions.Item>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.areaId}>{this.state.ct_details.largeAreaId}</Descriptions.Item>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.totalInvest}>{this.state.ct_details.amount}</Descriptions.Item>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.profitLevel}>{this.state.ct_details.profitLevel}</Descriptions.Item>
                                            <Descriptions.Item
                                                label={Lang[this.state.lang].account.title.latestTime}>{convertUTCDate(staticTimestamp)}</Descriptions.Item>
                                        </Descriptions>
                                    </Skeleton>
                                </List.Item>

                            </List>
                        </div>

                    </div>
                </Content>

                <SelectAccount visible={showAccountSelect} selectAccount={this.selectAccount}
                               hiddenAccount={this.hiddenAccount}/>

                <Modal
                    title={Lang[this.state.lang].account.modal.deposit.title}
                    visible={this.state.showDeposit}
                    onCancel={this.handleCancel}
                    footer={null}
                    getContainer={false}
                >
                    <div style={{textAlign: "center"}}>
                        <canvas id="qrImg"></canvas>
                        <p style={{wordBreak: 'normal', whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                            <small>{this.state.currentAccount.MainPKr}</small></p>
                        <Button className='copyTxt' onClick={() => {
                            copy(this.state.currentAccount.MainPKr);
                            message.success('Copy to clipboard successfully');
                        }}>{Lang[this.state.lang].account.modal.deposit.copy}</Button>
                    </div>
                </Modal>

                <InvestForm
                    wrappedComponentRef={this.saveInvestFormRef}
                    visible={this.state.showInvest}
                    onCancel={this.handleInvestCancel}
                    onCreate={this.handleInvestCreate}
                    sero={this.state.balanceSero}
                    calcuPrincipalProfit={this.calcuPrincipalProfit}
                    rate={this.state.ct_rate}
                    lang={this.state.lang}
                    totalAmount={this.state.ct_details.amount}
                    referId={this.state.ct_details.referId}
                />

            </div>
        );
    }
}


class App extends Component {
    constructor() {
        super();
        this.state = {
            locale: zhCN,
        };
    }

    componentWillMount() {
        let lang = localStorage.getItem("lang");
        let locale = zhCN;
        if (lang) {
            if (lang === "zh_CN") {
                locale = zhCN;
            } else if (lang === "en_US") {
                locale = enUS;
            }
        } else {
            locale = zhCN;
            localStorage.setItem("lang", "zh_CN");
        }

        this.setState({
            locale: locale
        })
    }

    changeLocale = e => {
        const localeValue = e.target.value;
        this.setState({locale: localeValue});
        console.log(localeValue.locale);
        if (localeValue.locale === "en") {
            localStorage.setItem("lang", "en_US");
        } else if (localeValue.locale === "zh-cn") {
            localStorage.setItem("lang", "zh_CN");
        }
    };

    render() {
        const {locale} = this.state;
        return (
            <div className="App">
                <Layout className="layout">
                    <Header className="header">
                        <div className="logo"><img src={logo}/></div>
                        <h1>HAPY</h1>
                        <div className="change-locale">
                            <Radio.Group value={locale} onChange={this.changeLocale}>
                                <Radio.Button key="en" value={enUS}>
                                    English
                                </Radio.Button>
                                <Radio.Button key="cn" value={zhCN}>
                                    中文
                                </Radio.Button>
                            </Radio.Group>
                        </div>
                    </Header>
                    <ConfigProvider locale={locale}>
                        <ContentPage key={locale ? locale.locale : 'en'}/>
                    </ConfigProvider>
                    <Footer style={{textAlign: 'center'}}/>
                </Layout>
            </div>
        );
    }
}

function convertUTCDate(dateTimestamp) {
    if (dateTimestamp && dateTimestamp > 0) {
        let cDate = new Date(dateTimestamp * 1000);
        return appendZero(cDate.getMonth() + 1) + "/" + appendZero(cDate.getDate()) + " " + appendZero(cDate.getHours()) + ":" + appendZero(cDate.getMinutes());
    }
    return ""
}

function nextShareTime() {
    // test
    //return (Math.floor(new Date().getTime()/(10*60*1000))+1)*10*60*1000;
    let d = new Date();
    d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
    let year = d.getUTCFullYear();
    let month = d.getUTCMonth();
    let day = d.getUTCDate();
    d = new Date(year, month, day, 0, 0, 0);

    let tz = new Date().getTimezoneOffset() / 60;
    return d.getTime() + (-tz) * 60 * 60 * 1000;
}

function appendZero(i) {
    i = i < 10 ? "0" + i : i;
    return i;
}

export default App;

