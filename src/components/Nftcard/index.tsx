import {useState, useMemo, useEffect} from "react";
import * as anchor from "@project-serum/anchor";
import styled from "styled-components";
import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {useAnchorWallet} from "@solana/wallet-adapter-react";
import {MintCountdown} from './MintCountdown'
import { makeStyles } from '@material-ui/core/styles';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import AssignmentTurnedIn from '@material-ui/icons/AssignmentTurnedIn';
import {Badge} from '@material-ui/core';
import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineCM2State,
  mintOneCM2Token,
  mintMultipleCM2Token
} from "../../candy-machine-cm";
import {
  CandyMachineME,
  getCandyMachineMEState,
  mintOneMEToken,
  mintMultipleMEToken
} from "../../candy-machine-me";
import { toDate } from "../../utils";

import './index.css';
import CopyToClipboard from "../CopyToClipboard"
import axios from "axios";
import { SERVER_URL } from "../../config/prod";
import { BlockLike } from "typescript";

const UseStyles = makeStyles((theme) => ({
  letter: {
    color: 'white',
  },
  cmName: {
    fontSize: 20
  },
  nftcard: {
    display: 'flex',
    borderRadius: 20,
    color: 'white',
    backgroundColor: '#3c0c4a',
    border: 'inset',
    justifyContent: 'space-beween !important'
    
  },
  nfticon: {
    color: 'white',
  },
  paginatioin: {
    marginTop: 10
  },
  card: {
    minWidth: 275,
    border: 'none',
    color: 'white',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  margin: {
    margin: theme.spacing(1),
  },
  paper: {
    height: 100,
    backgroundColor: 'brown',
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));
const DivPublicKey = styled.div`
font-family: fangsong !important;
display: inline-block;
width: 180px;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
margin-bottom: -5px;
`

const mintingModalStyle = {
  color: '#fff',
  boxShadow: 'rgb(218 218 218 / 59%) 0px 20.9428px 37.5225px -6.10831px',
  p: 6,
}

interface MachineInfo {
  _id: string,
  image_url: string,
  machine_type: string,
  machine_id: string,
  admin: string,
  price: number,
  machine_collection: string,
  like: number,
  dislike: number,
  total_items: number,
  go_live_date: number,
  captcha: boolean,
  remain: boolean
}

export interface NftcardProps {
  info: MachineInfo;
  selected: boolean;
  mint: boolean;
  multi_mint_count: number;
  notSoldOut: boolean;
  chain: {
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
  },
  customUrl: string;
  rpcUrl: string;
  setAlertState: (payload: any) => void,
}

const Nftcard = (props: NftcardProps) => {
  const classes = UseStyles();

  const [mintingOpen, setMintingOpen] = useState(false);
  const [progressState, setProgressState] = useState(true);
  const [isCompleteCountDown, setIsCompleteCountDown] = useState(false);
  const [isMinting, setIsMinting] = useState(false)
  const [machine, setMachine] = useState<any>();
  const [remain, setRemain] = useState<any>(false);
  const [like, setLike] = useState(props.info.like);
  const [dislike, setDislike] = useState(props.info.dislike)
  const wallet = useAnchorWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }
    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const handleOneMint = async () => {
    try {
      setIsMinting(true);
      if (!wallet) {
        props.setAlertState({
          open: true,
          message: 'Connect your wallet',
          severity: 'info',
        });
        return;
      }
      if (wallet && machine?.program && wallet.publicKey) {
        const mint = anchor.web3.Keypair.generate();
        if(props.info.captcha) {
          await axios.get("https://passv2.civic.com/?provider=hcaptcha&redirectUrl=http://cmbot-3dboogles.herokuapp.com/&networkAddress=ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6&action=proofOfWalletOwnership&wallet=25Krheds8cwMam9TmwJkkXW5yRKW37oLNLYz1rfHFdgU&chain=solana", {headers: {"Access-Control-Allow-Origin": "*"}})
        }
        const mintTxId = props.info.machine_type == "CM2" ? (
          await mintOneCM2Token(machine, wallet.publicKey, mint)
        )[0] : (await mintOneMEToken(machine, wallet.publicKey));

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            10000,
            props.chain.connection,
            'singleGossip',
            true,
          );
        }

        if (!status?.err) {
          props.setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });

        } else {
          props.setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      console.log(error);
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      props.setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  }

  const handleBeforeMultiMint = async () => {
    const now = new Date().getTime();
    const startMachine = machine ? (machine.state?.goLiveDate?.toNumber() || 0) * 1000  : now;
    let timeOut = now - startMachine;
    timeOut = timeOut < 0 ? 100 : timeOut;

    setTimeout(async () => {
      try {
        setIsMinting(true);
        if (!wallet) {
          props.setAlertState({
            open: true,
            message: 'Connect your wallet',
            severity: 'info',
          });
          return;
        }
        if (wallet && machine?.program && wallet.publicKey) {

          const mintTxId = props.info.machine_type == "CM2" ? (
            await mintMultipleCM2Token(machine, wallet.publicKey, props.multi_mint_count)
          )[0] : (
            await mintMultipleMEToken(machine, machine.state.config, wallet.publicKey, machine.state.treasury, props.multi_mint_count)
          )[0];
          let status: any = { err: true };
          if (mintTxId) {
            status = await awaitTransactionSignatureConfirmation(
              mintTxId,
              props.chain.txTimeout,
              props.chain.connection,
              'singleGossip',
              true,
            );
          }

          if (!status?.err) {
            props.setAlertState({
              open: true,
              message: 'Congratulations! Mint succeeded!',
              severity: 'success',
            });

          } else {
            props.setAlertState({
              open: true,
              message: 'Mint failed! Please try again!',
              severity: 'error',
            });
          }
        }
      } catch (error: any) {
        // TODO: blech:
        let message = error.msg || 'Minting failed! Please try again!';
        if (!error.msg) {
          if (!error.message) {
            message = 'Transaction Timeout! Please try again.';
          } else if (error.message.indexOf('0x138')) {
          } else if (error.message.indexOf('0x137')) {
            message = `SOLD OUT!`;
          } else if (error.message.indexOf('0x135')) {
            message = `Insufficient funds to mint. Please fund your wallet.`;
          }
        } else {
          if (error.code === 311) {
            message = `SOLD OUT!`;
          } else if (error.code === 312) {
            message = `Minting period hasn't started yet.`;
          }
        }

        props.setAlertState({
          open: true,
          message,
          severity: "error",
        });
      } finally {
        setIsMinting(false);
      }
    }, timeOut);
  }

  const handleAfterMultiMint = async () => {
    try {
      setIsMinting(true);
      if (!wallet) {
        props.setAlertState({
          open: true,
          message: 'Connect your wallet',
          severity: 'info',
        });
        return;
      }
      if (wallet && machine?.program && wallet.publicKey) {
        const mintTxId = props.info.machine_type == "CM2" ? (
          await mintMultipleCM2Token(machine, wallet.publicKey, props.multi_mint_count)
        )[0] : (
          await mintMultipleMEToken(machine, machine.state.config, wallet.publicKey, machine.state.treasury, props.multi_mint_count)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.chain.txTimeout,
            props.chain.connection,
            'singleGossip',
            true,
          );
        }

        if (!status?.err) {
          props.setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });

        } else {
          props.setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      props.setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  }

  const handleMintingOpen = () => {
    setProgressState(true);
    setMintingOpen(true);
    (async () => {
        if (!anchorWallet) {
            return;
        }
        if (props.info.machine_id) {
            try {
              let cndy: any;
              if(props.info.machine_type == "CM2") {
                cndy = await getCandyMachineCM2State(
                  anchorWallet,
                  new PublicKey(props.info.machine_id),
                  props.chain.connection
                );
              }
              if(props.info.machine_type == "ME") {
                cndy = await getCandyMachineMEState(
                  anchorWallet,
                  new PublicKey(props.info.machine_id),
                  props.chain.connection
                );
              }
              let statusEdit =  {
                machine_id: cndy.id.toString(),
                is_soldout: cndy.state.isSoldOut
              }
              console.log('cndy', cndy);
              await axios.post(`${SERVER_URL}/api/status-edit`, statusEdit)
              setMachine({...machine, ...cndy});
              setProgressState(false);
            } catch (e) {
              console.log("Problem getting candy machine state");
              console.log(e);
              setProgressState(false);
            }
          } else {
            console.log("No candy machine detected in configuration.");
            setProgressState(false);
          }
    })();
    
  }

  const handleMintingClose = () => {
    setMintingOpen(false);
  }
  const setVote = async (machine_id: any, vote_type: boolean) => {
    await axios.post(SERVER_URL + "/api/set-vote",{user_addr: wallet?.publicKey, machine_id, vote_type}).then((res) => {
      if(res.data.status) {
        if(vote_type) {
            setLike(like + 1)
        } else {
            setDislike(dislike + 1)
        }
      }
    })
  }

  return (
    <>
      <div className="nft-card">
        <div className={`imageWrapper imageWrapper-75`}>
          <div className={`imageOver`}>
            <img src={props.info.image_url} className="border-radius-16" alt="Collection Image"/>
          </div>
        </div>


        <div className="mint-action">
          <CardContent>
            <Typography
              className={classes.letter}
              variant="body2"
              component="p"
            >
              
              <div className="align-items-center vote_container">
                <div className="col-12">
                  <span className={classes.cmName}>{props.info.machine_collection}</span>
                  
                </div>
                
                <div className="vote justify-content-between">
                  <div className="like_vote">
                    <IconButton
                      className="btn-icon"
                      onClick={() => {setVote(props.info.machine_id, true)}}
                    >
                      <img src="./like.png" className="icon_vote" alt="" />
                    </IconButton>  
                    <span className="vote_content">{like > 1000? (like/1000).toString().slice(0,3) + `k`: like}</span>
                  </div>

                  <div className="dislike_vote">
                      <IconButton
                        onClick={() => {setVote(props.info.machine_id, false)}}
                        className="btn-icon"
                      >
                        <img src="./dislike.png" className="icon_vote" alt="" />
                      </IconButton>
                      <span className="vote_content">{dislike > 1000? (dislike/1000).toString().slice(0,3) + `k`: dislike}</span>
                  </div>
                </div>

              </div>
              
              <Grid container direction="row" justifyContent="space-between" alignItems="center">
                <Grid item md={2}>
                  ID:
                </Grid>
                <Grid item md={6}>
                  {`${props.info.machine_id.substring(0,4)}...${props.info.machine_id.substring(props.info.machine_id.length - 4, props.info.machine_id.length)}`}
                  <CopyToClipboard>
                    {({ copy }) => (
                      <IconButton
                      onClick={() => copy(props.info.machine_id.toString())}
                      >
                        <AssignmentTurnedIn/>
                      </IconButton>
                    )}
                  </CopyToClipboard>
                </Grid>
                <Grid item md={2}>
                  Type:
                </Grid>
                <Grid item md={2}>
                  {props.info.machine_type}
                </Grid>
                <Grid item md={2}>
                  Start:
                </Grid>
                <Grid item md={6}>
                  {props.info.go_live_date != null ? new Date(props.info.go_live_date * 1000).toLocaleString() : 'Not Set'}
                </Grid>
                <Grid item md={2}>
                  Price:
                </Grid>
                <Grid item md={2}>
                {props.info.price}
                </Grid>
              </Grid>
            </Typography>
          </CardContent>

          <div className="card_btn_container">
          { 
            props.info.go_live_date > new Date().getTime()/1000 && !isCompleteCountDown ?
            <Button 
            disabled={true}
            className="card_btn_count_down">
              <MintCountdown
            date={ new Date(
                props.info.go_live_date * 1000               
            )}
            style={{ margin: 20 }}
            onComplete={() => {setIsCompleteCountDown(true)}}
          />
          </Button> :
          props.info.remain?
          <Button 
            disabled={true} 
            onClick={() => {}}
            className="card_btn_count_down">
              SOLD OUT
          </Button>
             : props.selected?
          <Button 
            disabled={props.mint} 
            onClick={handleMintingOpen}
            className="card_btn">
              Mint Now
          </Button>: 
          <Button 
            disabled={props.mint} 
            className="card_btn">
              CONNECT WALLET
          </Button>
          }
          </div>
        </div>
      </div>

      <Modal
        open={mintingOpen}
        onClose={handleMintingClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={mintingModalStyle} className='mui-box'>
          <Typography >
            {/* <Grid item xs={12}>
              <div className="minting_refresh_header">
                <div className="modal_minting">{props.info.machine_type}</div>
                <div>
                  <IconButton aria-label="refresh" className="icon_btn">
                    <RefreshIcon />
                  </IconButton>
                </div>
              </div>
            </Grid> */}
            <div className="d-flex align-items-center justify-content-between minting_list">
                <p className="font-900">
                  Type: 
                </p>
                <p>
                  {props.info.machine_type}
                </p>
            </div>

            {(progressState == true || !machine || machine.state?.itemsRemaining < 1) &&
              <Grid item xs={12}>
                <div className="modal_progress_container">
                  {progressState == true && <CircularProgress className="modal_progress"/>}
                  {!progressState && (!machine || machine.state?.itemsRemaining < 1) && 
                    <p className="text-center">SOLD OUT</p>
                  }
                </div>
              </Grid>
            }

            {progressState == false && machine?.state?.itemsRemaining > 0 &&
              <Grid item xs={12}>
                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Available:
                    </p>
                    <p>
                      {machine ? `${machine.state.itemsRemaining}/${machine?.state.itemsAvailable}` : ''}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Collection Name:
                    </p>
                    <p>
                      {machine ? props.info.machine_collection : ''}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Machine Id:
                    </p>
                    <div className="d-flex align-items-center justify-content-between machine-id">
                      <p>{machine ? `${props.info.machine_id.substring(0, 4)}...${props.info.machine_id.substring(props.info.machine_id.length -4 , props.info.machine_id.length)}` : ''}</p>
                      <div>
                        {machine && <CopyToClipboard>
                          {({ copy }) => (
                            <IconButton
                            onClick={() => copy(props.info.machine_id.toString())}
                            className="ml-8 pt-0 pb-0 pl-0 pr-0"
                            >
                              <AssignmentTurnedIn/>
                            </IconButton>
                          )}
                        </CopyToClipboard>}
                      </div>

                    </div>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Price:
                    </p>
                    <p>
                      {machine ? (machine.state?.price?.toNumber() || 0) / LAMPORTS_PER_SOL : ''}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Start date:
                    </p>
                    <p>
                      {machine ? new Date(toDate(machine.state.goLiveDate)?.toString()).toLocaleString() : ''}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Captcha:
                    </p>
                    <p>
                      {machine && machine.state.gatekeeper != null ? 'Yes' : 'No Required'}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Status:
                    </p>
                    <p>
                      {machine && machine.state.isSoldOut ? 'SoldOut' : machine?.state.isActive ? 'Live' : 'Not Live'}
                    </p>
                </div>

                <div className="d-flex align-items-center justify-content-between minting_list">
                    <p className="font-900">
                      Times tried:
                    </p>
                    <p>
                      0
                    </p>
                </div>
              </Grid>
            }
              <Grid item xs={12}>
                <div className="mt-16">
                  <div className="d-flex align-items-center justify-content-between">
                    {progressState == false && machine?.state?.itemsRemaining > 0 &&
                      <>
                        <Button onClick={handleOneMint} variant="outlined" className="card_contain_btn">MINT</Button>
                        <Button onClick={handleBeforeMultiMint} variant="outlined" className="card_outline_btn">MINT AUTO</Button>
                        <Button onClick={handleAfterMultiMint} variant="outlined" className="card_outline_btn">M.A.I</Button>
                      </>
                    }
                    <Button onClick={handleMintingClose} variant="outlined" className="card_btn">CLOSE</Button>
                  </div>
                </div>
              </Grid>
          </Typography>
        </Box>
      </Modal>
      {/* </Grid> */}
    </>
  );
}

export default Nftcard;
