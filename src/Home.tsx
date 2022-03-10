import React, { useEffect, useState } from "react";
import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import TextField from '@material-ui/core/TextField';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Modal from '@material-ui/core/Modal';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Alert from '@material-ui/lab/Alert';
import { Snackbar } from '@material-ui/core'
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import CopyToClipboard from "./components/CopyToClipboard"

import IconButton from '@material-ui/core/IconButton';

import CircularProgress from '@material-ui/core/CircularProgress';
import SearchIcon from '@material-ui/icons/Search';
import AssignmentTurnedIn from '@material-ui/icons/AssignmentTurnedIn';

import { InputLabel } from '@material-ui/core';

import axios from "axios"

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineCM2State,
  mintOneCM2Token,
  mintMultipleCM2Token
} from "./candy-machine-cm";
import {
  CandyMachineME,
  getCandyMachineMEState,
  mintOneMEToken,
  mintMultipleMEToken
} from "./candy-machine-me";

import { toDate, AlertState } from './utils';
import { SolanaClient } from './helpers/sol';
import Nftcard from './components/Nftcard'

import {
  ENVIRONMENT,
  SERVER_URL,
  MULTI_MINT_COUNT,
  UPDATEAUTHORITY_ADDRESS,
  ALLOWED_NFT_NAME
} from "./config/dev"

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  letter: {
    color: 'white',
  },
  paginatioin: {
    marginTop: 10,
  },

  btn: {
    marginTop: 20,
    padding: theme.spacing(2),
    color: 'black !important',
    background: '#DADADA'
  },
  walletBtn: {
    marginLeft: 'auto',
    order: 2,
    backgroundColor: '#891d31',
  },
  extractBtn: {
    borderRadius: 30,
    backgroundColor: '#712587',
  },
  outlineBtn: {
    marginTop: 20,
    padding: theme.spacing(2),
    color: 'white',
    borderColor: '#DADADA !important',
    marginLeft: '20px',
  },

  textfieldgrid: {
    padding: theme.spacing(2),
  },
  textfield: {
    width: '100%',
    color: 'white',
    borderColor: '#DADADA'
  },
  modaltextfield: {
    width: '100%',
    marginTop: 15,
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
  textInfo: {
    width: '100%',
    textAlign: 'center',
    color: '#03a9f4',
    fontSize: 30,
    paddingTop: 22
  },
  textWarning: {
    width: '100%',
    textAlign: 'center',
    color: '#ffc107',
    fontSize: 30,
    paddingTop: 22
  },

  searchicon: {
    color: 'white',
  },
  pos: {
    color: 'white',
    fontSize: 23,
    marginBottom: 12,
    fontFamily: 'Industry',
    marginLeft: 20
  },
  upcoming: {
    paddingLeft: 17,
    fontSize: 30,
    marginBottom: 12,
    color: '#d0bcb3',
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
  footer: {
    letterSpacing: 20,
    color: '#DADADA',
    textAlign: 'center',
  },
  formControl: {
    minWidth: 280,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  loading: {
    width: '100%',
    textAlign: 'center'
  },
  btn_page_drop: {
    margin: 'auto',
    display: 'flex',
    width: 287,
    border: 'groove',
    borderRadius: 9,
    backgroundColor: '#009688'
  }
}));

const customMintModalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 480,
  bgcolor: '#0e0716',
  color: '#fff',
  boxShadow: 'rgb(218 218 218 / 59%) 0px 20.9428px 37.5225px -6.10831px',
  p: 6,
}

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  txTimeout: number;
  rpcHost: string;
  solanaClient: SolanaClient;
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
  captcha: boolean
}

const Home = (props: HomeProps) => {
  const [env, setEnv] = useState(ENVIRONMENT);
  const [selected, setSelected] = useState(false);
  const [customMintOpen, setCustomMintOpen] = useState(false);
  const [searchMachineId, setSearchMachineId] = useState('');
  const [version, setVersion] = useState('CM2');
  const [customUrl, setCustomUrl] = useState(props.rpcHost);
  const [rpcUrl, setRPCUrl] = useState('custom');
  const [searchState, setSearchState] = useState(true);
  const [scrapingUrl, setScrapingUrl] = useState('');
  const [machine, setMachine] = useState<any>();
  const [machineBuffer, setMachineBuffer] = useState<MachineInfo[]>([])
  const [isMinting, setIsMinting] = useState(false)
  const [isNFTOwner, setIsNFTOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [isGetPage, setIsGetPage] = useState(true);
  const [scrapedPubkeys, setScrapedPubkeys] = useState([])
  const [handleOpenExtractMachineModal, setHandleOpenExtractMachineModal] = useState(false)
  const [scrapedMachineStates, setScrapedMachineStates] = useState<CandyMachine[]>([]);
  const [scrapeResult, setScrapeResult] = useState(false);
  const [searchCollectionKey, setSearchCollectionKey] = useState('')
  const [loadMoreCount, setLoadMoreCount] = useState(1)
  const [machineVersion, setMachineVersion] = useState('CM2')
  const wallet = useAnchorWallet();

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const classes = useStyles();
  const getCandyMachineIdFromUrl = () => {
    setIsLoading(true);
    axios.post(`/extract-machine`, {
      scrapingUrl: scrapingUrl
    }).then((res) => {
      if (res.data.status === 'success') {
        setScrapedPubkeys(res.data.msg);
        setScrapeResult(true)
      } else {
        setScrapeResult(false);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.log(error)
      setIsLoading(false);
    })

  }
  const handleCustomMintOpen = async () => {
    if(version == 'ML') {
      setCustomMintOpen(true);
    } else {
      if(!searchMachineId) {
        setAlertState({
          open: true,
          message: 'Input searching machine ID.',
          severity: 'error'
        })
        return;
      }
      setCustomMintOpen(true);
      setSearchState(true);
  
      const url = rpcUrl === 'custom' ? customUrl : rpcUrl;
      const connection = new anchor.web3.Connection(url);
      try {
        let cndy: any, config;
        if(version == "CM2") {
          cndy = await getCandyMachineCM2State(
            wallet as anchor.Wallet,
            new PublicKey(searchMachineId),
            connection
          );
        }
        if(version == "ME") {
          cndy = await getCandyMachineMEState(
            wallet as anchor.Wallet,
            new PublicKey(searchMachineId),
            connection
          );
        } 
        setMachine(cndy);
      } catch (err: any) {
        console.log(err);
        setAlertState({
          open: true,
          message: 'Account does not exist: ' + searchMachineId,
          severity: 'error'
        })
        setCustomMintOpen(false);
      } finally {
        setSearchState(false);
      }
    }
    
  }

  const handleCustomMintClose = () => {
    setCustomMintOpen(false);
  }
  const handleCloseExtractModal = () => {
    setHandleOpenExtractMachineModal(false);
    setScrapingUrl('');
    setScrapedPubkeys([]);
    setScrapedMachineStates([]);

  }
  const getNftsFromWallet = async () => {
    const pubKey = wallet?.publicKey?.toString() || '';

    setIsLoading(true)
    try {
      let result = await props.solanaClient.getAllCollectibles([pubKey], [{ updateAuthority: UPDATEAUTHORITY_ADDRESS, collectionName: ALLOWED_NFT_NAME }])
      console.log(result)
      setIsLoading(false)
      if (result[pubKey].length) {
        setIsNFTOwner(true);
      }
    } catch (err) {
      setIsLoading(false)
    }
  }

  const loadMoreMachines = () => {
    getMachines(loadMoreCount + 1, searchCollectionKey, machineVersion, true)
  }

  const getMachines = (page: number, search: string, type: string, isPage: boolean) => {

    // setLoading(true);
    let data = '?';
    data += `page=${page}`;
    if (search) {
      data = `${data}&search=${search}`;
    }
    if (type) {
      data = `${data}&type=${type}`;
    }
    axios.get(`${SERVER_URL}/api/get-machines${data}`).then((res) => {
      const buffer: MachineInfo[] = []
      if (isPage) {
        Object.assign(buffer, machineBuffer);
        if (res.data.machines.length > 0) {
          for (let i = 0; i < res.data.machines.length; i++) {
            buffer.push(res.data.machines[i])
          }
          setMachineBuffer(buffer)
          setLoadMoreCount(page)
        }
      } else {
        setMachineBuffer(res.data.machines)
        setLoadMoreCount(page)
      }

    }).catch((err) => {
      setAlertState({
        open: true,
        message: 'server error!',
        severity: 'error'
      })
      // setLoading(false)
      // setPages(0)
    });
  }

  const handleOneMint = async () => {
    try {
      setIsMinting(true);
      if (!wallet) {
        setAlertState({
          open: true,
          message: 'Connect your wallet',
          severity: 'info',
        });
        return;
      }
      if (wallet && machine?.program && wallet.publicKey) {
        const mint = anchor.web3.Keypair.generate();
        let mintTxId: any;
        if(version === "CM2") {
          mintTxId = (await mintOneCM2Token(machine, wallet.publicKey, mint))[0]
        }  
        if(version === "ME") {
          console.log("here")
          mintTxId = (await mintOneMEToken(machine, wallet.publicKey));
        }
        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            20000,
            props.connection,
            'singleGossip',
            true,
          );
        }

        if (!status?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });

        } else {
          setAlertState({
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

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  }

  const handleBeforeMultiMint = async () => {
    const now = Date.now();
    const startMachine = machine ? machine.state.goLiveDate.toNumber() * 1000 : now;
    let timeOut = now - startMachine;
    timeOut = timeOut < 0 ? 100 : timeOut;

    setTimeout(async () => {
      try {
        setIsMinting(true);
        if (!wallet) {
          setAlertState({
            open: true,
            message: 'Connect your wallet',
            severity: 'info',
          });
          return;
        }
        if (wallet && machine?.program && wallet.publicKey) {
          const mintTxId = version === "CM2" ? (
            await mintMultipleCM2Token(machine, wallet.publicKey, MULTI_MINT_COUNT)
          )[0] : (
            await mintMultipleMEToken(machine, machine.state.config, wallet.publicKey, machine.state.treasury, MULTI_MINT_COUNT)
          )[0];

          let status: any = { err: true };
          if (mintTxId) {
            status = await awaitTransactionSignatureConfirmation(
              mintTxId,
              props.txTimeout,
              props.connection,
              'singleGossip',
              true,
            );
          }

          if (!status?.err) {
            setAlertState({
              open: true,
              message: 'Congratulations! Mint succeeded!',
              severity: 'success',
            });

          } else {
            setAlertState({
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

        setAlertState({
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
        setAlertState({
          open: true,
          message: 'Connect your wallet',
          severity: 'info',
        });
        return;
      }
      if (wallet && machine?.program && wallet.publicKey) {
        const mintTxId = version === "CM2" ? (
          await mintMultipleCM2Token(machine, wallet.publicKey, MULTI_MINT_COUNT)
        )[0] : (
          await mintMultipleMEToken(machine, machine.state.config, wallet.publicKey, machine.state.treasury, MULTI_MINT_COUNT)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            'singleGossip',
            true,
          );
        }

        if (!status?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });

        } else {
          setAlertState({
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

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  }
  const getCndyStateByScrapingId = async () => {
    
    let machineStates = [];
    setScrapedMachineStates([])
    for(let i = 0; i < scrapedPubkeys.length; i++) {
      const url = rpcUrl === 'custom' ? customUrl : rpcUrl;
      const connection = new anchor.web3.Connection(url);
      try {
        const cndyCM2 = await getCandyMachineCM2State(
          wallet as anchor.Wallet,
          new PublicKey(scrapedPubkeys[i]),
          connection
        );
        machineStates.push(cndyCM2);
        console.log(machineStates);
      } catch (err: any) {
        
      }
    }
    if(machineStates.length > 0) {
      setScrapedMachineStates(machineStates);
    } else {
      setScrapeResult(false);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    if (scrapedPubkeys !== []) {
      getCndyStateByScrapingId()
    }
    setSearchState(false)
  }, [machine, scrapedPubkeys])

  useEffect(() => {
    (async () => {
      setIsNFTOwner(false);
      if (wallet) {
        setSelected(true);
        getNftsFromWallet();
        getMachines(loadMoreCount, searchCollectionKey, machineVersion, isGetPage)
      }
      else {
        setSelected(false);
        setIsLoading(false);
      }
    })();
  }, [wallet, props.connection]);
  return (
    <>
      <div>
        <Container className="root" maxWidth="lg">
          <div>
            <Grid
              container
              justifyContent="space-between"
            >
              <WalletMultiButton
                className={classes.btn + " " + classes.walletBtn}
              />
            </Grid>

            <Card className={classes.card} variant="outlined">
              <div className="title-container">
                <h1 className="title">
                  TERMINTER
                </h1>

                <p className={classes.pos} >
                  Best Bot on Solana
                </p>
              </div>
              <div className="logo-container">
                <img src="./logo.png" alt="" className="terminator-logo" />
                <div className="custom-mint-container">
                  <div className="description">
                    <img src="./icon_cloud.png" className="des-icon" />
                    <div className="description-title">Competition</div>
                    <div className="description-content">
                      This bot is created to evolve to always one up any competition in the solana space
                    </div>
                  </div>
                  <div className="custom-mint">
                    {!isLoading && ((wallet && isNFTOwner) || env == "development") &&
                      <>
                        <div className="custom-content">
                          <div className="sub-title">
                            <p>RPC URL</p>
                            <p>Custom URL</p>
                            <p>Machine ID</p>
                            <p>CM Version</p>

                          </div>
                          <Grid container className="custom-mint-container">
                            <Grid item className="custom-input" xs={12} md={12}>
                              <FormControl variant="outlined" fullWidth>
                                <Select
                                  labelId="demo-simple-select-outlined-label"
                                  id="demo-simple-select-outlined"
                                  value={rpcUrl}
                                  onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
                                    const val = event.target.value as string;
                                    setRPCUrl(val);
                                  }}
                                >
                                  <MenuItem value={`https://solana-api.projectserum.com`}>GenesysGo(https://solana-api.projectserum.com)</MenuItem>
                                  <MenuItem value={`https://api.metaplex.solana.com`}>Metaplex(https://api.metaplex.solana.com)</MenuItem>
                                  <MenuItem value={`custom`}>Custom({customUrl})</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item className="custom-input" xs={12} md={12}>

                              {rpcUrl == 'custom' &&
                                <TextField
                                  onChange={(e) => setCustomUrl(e.target.value)}
                                  className={classes.textfield}
                                  id="input-custom-url"
                                  value={customUrl}
                                  variant="outlined"
                                  style={{ color: 'white' }}
                                />
                              }
                            </Grid>
                            <Grid item className="custom-input" xs={12} md={12}>

                              <TextField
                                onChange={(e) => setSearchMachineId(e.target.value)}
                                className={classes.textfield}
                                id="input-custom-url"
                                value={searchMachineId}
                                variant="outlined"
                                style={{ color: 'white' }}
                              />
                            </Grid>

                            <Grid item className="custom-input" xs={12} md={12}>
                              <FormControl variant="outlined" fullWidth>
                                <Select
                                  labelId="demo-simple-select-outlined-label"
                                  id="demo-simple-select-outlined"
                                  value={version}
                                  onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
                                    const val = event.target.value as string;
                                    setVersion(val);
                                  }}
                                >
                                  <MenuItem value={`CM2`}>v2</MenuItem>
                                  <MenuItem value={`ME`}>ME</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                          </Grid>
                        </div>

                        <Button
                          onClick={handleCustomMintOpen}
                          variant="contained"
                          size="medium"
                          className="btn-custom"
                        >
                          CUSTOM MINT
                        </Button>
                      </>
                    }
                    {isLoading &&
                      <div className={classes.loading}>
                        <CircularProgress />
                      </div>
                    }
                    {!wallet &&
                      <Grid container>
                        {!wallet &&
                          <p className={classes.textInfo}>
                            Please connect your wallet.<br />
                            Only our NFT holders can do mint!
                          </p>
                        }
                      </Grid>
                    }
                    {!isLoading && wallet && !isNFTOwner && env != "development" &&
                      <Grid container>
                        <p className={classes.textWarning}>
                          You don't have any of our NFTs.<br />
                          Only our NFT holders can do mint!
                        </p>
                      </Grid>
                    }
                  </div>
                </div>

                <img src="./solana_logo.png" alt="" className="terminator-logo" />
              </div>
            </Card>
          </div>
          <Modal
            open={handleOpenExtractMachineModal}
            onClose={handleCloseExtractModal}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={customMintModalStyle}>
              <Typography id="modal-modal-description">
                <TextField
                  onChange={(e) => setScrapingUrl(e.target.value)}
                  className={classes.modaltextfield}
                  error
                  id="input_siteurl"
                  label="Website URL"
                  value={scrapingUrl}
                  variant="outlined"
                />
                <br />
                {isLoading &&
                  <div className={classes.loading}>
                    <br />
                    <CircularProgress />
                  </div>
                }
                {scrapedMachineStates.length != 0 && scrapeResult &&
                  scrapedMachineStates.map((machine, index) => {
                    return <div className="extract_machine_state">
                      <Divider />
                      <Grid item xs={12}>
                        <div className="machine_info_id">Machine Id: {machine.id.toString()}
                          <CopyToClipboard>
                            {({ copy }) => (
                              <IconButton
                                onClick={() => copy(machine.id.toString())}
                              >
                                <AssignmentTurnedIn />
                              </IconButton>
                            )}
                          </CopyToClipboard>
                        </div>
                      </Grid>
                      <Divider />
                      <Grid item xs={12}>
                        <div className="machine_info_list">
                          <div className="machine_info">
                            ItemsRemaining: {machine ? `${machine.state.itemsRemaining}` : ''}
                          </div>
                          <div className="machine_info">
                            ItemsAvailable: {machine ? `${machine.state.itemsAvailable}` : ''}
                          </div>
                          <div className="machine_info">
                            ItemsRedeemed: {machine ? `${machine.state.itemsRedeemed}` : ''}
                          </div>
                          <div className="machine_info">
                            Price: {machine ? machine.state.price.toNumber() / LAMPORTS_PER_SOL : ''}
                          </div>
                          <div className="machine_info">
                            GoLiveDate: {machine ? toDate(machine.state.goLiveDate)?.toString() : ''}
                          </div>
                          <div className="machine_info">
                            Captcha: {machine && machine.state.gatekeeper != null ? 'Yes' : 'No Required'}
                          </div>
                          <div className="machine_info">
                            Status: {machine && machine.state.isSoldOut ? 'SoldOut' : machine?.state.isActive ? 'Live' : 'Not Live'}
                          </div>
                          {machine.state.whitelistMintSettings &&
                            <div>
                              <div className="machine_info">
                                WhiteListToken: {machine ? machine.state.whitelistMintSettings?.mint.toString() : ''}
                                <CopyToClipboard>
                                  {({ copy }) => (
                                    <IconButton
                                      onClick={() => copy(machine.state.whitelistMintSettings ? machine.state.whitelistMintSettings?.mint.toString() : '')}
                                    >
                                      <AssignmentTurnedIn />
                                    </IconButton>
                                  )}
                                </CopyToClipboard>
                              </div>
                              <div className="machine_info">
                                DiscountPrice: {machine.state.whitelistMintSettings.discountPrice ? machine.state.whitelistMintSettings.discountPrice.toNumber() / LAMPORTS_PER_SOL : '0'}
                              </div>
                            </div>
                          }
                        </div>
                      </Grid>
                    </div>
                  })
                }
                {!isLoading && !scrapeResult &&
                  <div className="extract_machine_state_display">
                    <Divider />
                    <Grid item xs={12}>
                      <div className="custommint_refresh_header">
                        <div className="modal_custommint">No Result</div>
                      </div>
                    </Grid>
                    <Divider />
                  </div>
                }
                <Grid item xs={12}>
                  <div className="close_btn_container">
                    <div className="minting_btn_container">
                      <Button disabled={false} onClick={() => { getCandyMachineIdFromUrl() }} variant="outlined" className="card_outline_btn">EXTRACT</Button>
                      <Button onClick={handleCloseExtractModal} className="card_btn">CLOSE</Button>
                    </div>
                  </div>
                </Grid>
              </Typography>
            </Box>
          </Modal>
        </Container>
        <Container>
          {!isLoading && ((wallet && isNFTOwner) || env == "development") &&
            <>
              <div className="search-collection-container">
                <p className={classes.upcoming}>
                  PRODUCTS SCANNED
                </p>
                <div className="search-collection-field">
                  <Grid item className={classes.textfieldgrid} xs={12} md={3}>
                    <FormControl variant="outlined" fullWidth>
                      <InputLabel id="demo-simple-select-outlined-label" style={{ color: 'white' }}>CM version</InputLabel>
                      <Select
                        labelId="demo-simple-select-outlined-label"
                        id="demo-simple-select-outlined"
                        value={machineVersion}
                        label="CM version"
                        onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
                          const val = event.target.value as string;
                          setMachineVersion(val);
                          setIsGetPage(false);
                          getMachines(1, searchCollectionKey, val, false)
                        }}
                      >
                        <MenuItem value={`CM2`}>CM2</MenuItem>
                        <MenuItem value={`ME`}>ME</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <TextField
                    onChange={(e) => {
                      setSearchCollectionKey(e.target.value);
                      setIsGetPage(false);
                      getMachines(1, e.target.value, machineVersion, false)
                    }}
                    className="search-collection"
                    id="outlined-error"
                    label="Search Id | Name"
                    value={searchCollectionKey}
                    variant="outlined"
                    style={{ color: 'white' }}
                    InputProps={{
                      endAdornment: (
                        <IconButton>
                          <SearchIcon
                            className={classes.searchicon}
                          />
                        </IconButton>
                      ),
                    }}
                  />
                </div>
              </div>

              <Grid className="upcoming-drop-cards">
                {machineBuffer.map((machine, idx) => {
                  return <>
                    <Nftcard
                      setAlertState={setAlertState}
                      info={machine}
                      mint={!selected}
                      selected={selected}
                      multi_mint_count={MULTI_MINT_COUNT}
                      chain={{
                        connection: props.connection,
                        txTimeout: props.txTimeout,
                        rpcHost: props.rpcHost
                      }}
                    />
                  </>
                })}
              </Grid>
              <Grid>
                <Button className={classes.btn_page_drop} onClick={() => {
                  loadMoreMachines();
                  setIsGetPage(true)
                }}>Load More</Button>
              </Grid>
              <Grid>
                <h1 className={classes.footer}>TERMINTER</h1>
                <br />
              </Grid>

              <Modal
                open={customMintOpen}
                onClose={handleCustomMintClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
              >
                <Box sx={customMintModalStyle}>
                  <Typography id="modal-modal-description">
                    <FormControl variant="outlined" fullWidth error>
                      <InputLabel id="demo-simple-select-outlined-label" style={{ color: 'white' }}>CM version</InputLabel>
                      <Select
                        labelId="demo-simple-select-outlined-label"
                        id="demo-simple-select-outlined"
                        value={version}
                        label="CM version"
                        onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
                          const val = event.target.value as string;
                          setVersion(val);
                        }}
                      >
                        <MenuItem value={`CM2`}>v2</MenuItem>
                        {/* <MenuItem value={`ME`}>ME</MenuItem> */}
                      </Select>
                    </FormControl>
                    <TextField
                      onChange={(e) => setSearchMachineId(e.target.value)}
                      className={classes.modaltextfield}
                      error
                      id="outlined-error"
                      label="Search"
                      value={searchMachineId}
                      variant="outlined"
                    />
                    <Grid item xs={12}>
                      <div className="custommint_refresh_header">
                        <div className="modal_custommint">Custom Mint</div>
                        {/* <div>
                        <IconButton aria-label="refresh" className="icon_btn">
                          <RefreshIcon />
                        </IconButton>
                      </div> */}
                      </div>
                    </Grid>
                    <Grid item xs={12}>
                      <div className="modal_progress_container">
                        {searchState == true &&
                          <CircularProgress className="modal_progress" />
                        }
                        {searchState == false &&
                          <div>
                            <Grid item xs={12}>
                              <div className="minting_list">
                                Available: {machine ? `${machine.state.itemsRemaining}/${machine?.state.itemsAvailable}` : ''}
                              </div>
                              <div className="minting_list">
                                Price: {machine ? machine.state.price.toNumber() / LAMPORTS_PER_SOL : ''}
                              </div>
                              <div className="minting_list">
                                Start date: {machine ? toDate(machine.state.goLiveDate)?.toString() : ''}
                              </div>
                              <div className="minting_list">
                                Captcha: {machine && machine.state.gatekeeper != null ? 'Yes' : 'No Required'}
                              </div>
                              <div className="minting_list">
                                Status: {machine && machine.state.isSoldOut ? 'SoldOut' : machine?.state.isActive ? 'Live' : 'Not Live'}
                              </div>
                              <div className="minting_list">
                                Times tried: 0
                              </div>
                            </Grid>
                          </div>
                        }
                      </div>
                    </Grid>
                    <Grid item xs={12}>
                      <div className="close_btn_container">
                        <div className="minting_btn_container">
                          {searchState == false &&
                            <>
                              <Button onClick={handleOneMint} variant="contained" className="card_contain_btn">MINT</Button>
                              <Button onClick={handleBeforeMultiMint} variant="outlined" className="card_outline_btn">MINT AUTO</Button>
                              <Button onClick={handleAfterMultiMint} variant="outlined" className="card_outline_btn">M.A.I</Button>
                            </>
                          }
                          <Button onClick={handleCustomMintClose} className="card_btn">CLOSE</Button>
                        </div>
                      </div>
                    </Grid>
                  </Typography>
                </Box>
              </Modal>
            </>
          }
        </Container>
        <Snackbar
          open={alertState.open}
          autoHideDuration={3000}
          onClose={() => setAlertState({ ...alertState, open: false })}
        >
          <Alert
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
          >
            {alertState.message}
          </Alert>
        </Snackbar>
      </div>
    </>
  );
};

export default Home;
