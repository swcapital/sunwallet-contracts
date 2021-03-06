import React, { useState, useEffect } from 'react'
import {
  Card,
  FormControl,
  Button,
  Radio,
  RadioGroup,
  CardContent,
  Typography,
  FormControlLabel,
  TextField,
  Container,
  AppBar,
  CircularProgress,
  Toolbar,
  Select,
  MenuItem,
  InputLabel
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'

import { connectWallet, getTxUrl } from './web3Utils'
import { sendRequestToBiconomy } from './biconomyService'
import {
  getUnblockTokensData,
  getTransferTokensData,
  getRequiredSunAmount,
  getUserTokenBalance,
  isUserBlocked,
  getSwapTokensData,
  approveNonMetaTokens,
  getAmountOut
} from './contractsService'
import './App.css'


const App = () => {
  const [approveRadio, setApproveRadio] = useState('sun')
  const [swapTokenSelect, setSwapTokenSelect] = useState('sun')
  const [swapTargetTokenSelect, setSwapTargetTokenSelect] = useState('mkr')
  const [swapReceiverWallet, setSwapReceiverWallet] = useState('')
  const [swapTokenAmount, setSwapTokenAmount] = useState('')
  const [swapTargetTokenAmount, setSwapTargetTokenAmount] = useState('')
  const [userWallet, setUserWallet] = useState()
  const [walletLoading, isWalletLoading] = useState(false)
  const [requiredSunAmount, setRequiredSunAmount] = useState()
  const [userSunBalance, setUserSunBalance] = useState()
  const [userBlocked, setUserBlocked] = useState()

  useEffect(() => {
    initWalletConnect()
  }, [])

  useEffect(() => {
    if (swapTokenAmount && Number(swapTokenAmount) > 0) {
      showAmountOut()
    } else {
      setSwapTargetTokenAmount('')
    }
  }, [swapTokenAmount, swapTargetTokenSelect])

  const initWalletConnect = () => {
    // Show loading icon
    isWalletLoading(true)

    connectWallet()
    .then((account) => {
      // Fetch user and contract data
      const promises = [
        isUserBlocked(account),
        getUserTokenBalance(account, 'sun'),
        getRequiredSunAmount()
      ]

      return Promise.all(promises).then(([blocked, userBalance, requiredSunAmount]) => {
        setUserBlocked(blocked)
        setUserSunBalance(userBalance)
        setRequiredSunAmount(requiredSunAmount)
        setUserWallet(account)
        setSwapReceiverWallet(account)
      })
    })
    .catch(error => {
      alert(error.message)
    })
    .finally(() => {
      // Hide loading icon
      isWalletLoading(false)
    })
  }

  const _approveRadioChange = (event) => {
    setApproveRadio(event.target.value)
  }

  const getMaxBalance = () => {
    getUserTokenBalance(userWallet, swapTokenSelect)
    .then(amount => setSwapTokenAmount(amount.split(',').join('')))
  }

  const showAmountOut = async () => {
    try {
      const amount = await getAmountOut(swapTokenAmount, swapTokenSelect, swapTargetTokenSelect)
      const ethAmount = window.web3.utils.fromWei(amount, 'ether')
      setSwapTargetTokenAmount(ethAmount)
    } catch (error) {
      alert('Selected pair does not exist.')
    }
  }

  const handleApprove = async (event) => {
    event.preventDefault()

    try {
      if (approveRadio === 'other') {
        const otherTokenAddress = event.target.elements.otherToken.value
        if (!otherTokenAddress) throw { message: 'Empty token address '}

        approveNonMetaTokens(userWallet, otherTokenAddress)
        .on('transactionHash', txHash => {
          if (window.confirm('Sent!\n\nCheck transaction on Etherscan?')) {
            window.open(getTxUrl(txHash), '_blank')
          }
        })
      } else {
        const requestBody = await getUnblockTokensData(userWallet, approveRadio)
        const txHash = await sendRequestToBiconomy(requestBody)

        if (window.confirm('Sent!\n\nCheck transaction on Etherscan?')) {
          window.open(getTxUrl(txHash), '_blank')
        }
      }

    } catch (error) {
      alert(error.message ? error.message : error)
    }
  }

  const handleTransfer = async (event) => {
    event.preventDefault()

    try {
      const amount = event.target.elements.amount.value
      const receiver = event.target.elements.receiver.value
      const requestBody = await getTransferTokensData(userWallet, receiver, amount, approveRadio)
      const txHash = await sendRequestToBiconomy(requestBody)
      if (window.confirm('Sent!\n\nCheck transaction on Etherscan?')) {
        window.open(getTxUrl(txHash), '_blank')
      }
    } catch (error) {
      alert(error.message ? error.message : error)
    }
  }

  const handleSwap = async (event) => {
    event.preventDefault()

    try {
      const requestBody = await getSwapTokensData(userWallet, swapTokenAmount, swapTargetTokenAmount, swapTokenSelect, swapTargetTokenSelect, swapReceiverWallet)
      const txHash = await sendRequestToBiconomy(requestBody)
      if (window.confirm('Sent!\n\nCheck transaction on Etherscan?')) {
        window.open(getTxUrl(txHash), '_blank')
      }
    } catch (error) {
      alert(error.message ? error.message : error)
    }
  }

  return (
    <div className="App">
      <AppBar position="static" className="header">
        <Toolbar className="flex-space-between">
          <Typography variant="h6">
            SUN Meta-tx Dapp
          </Typography>
          {userWallet}
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm">
        {userWallet ?
          <>
            {userBlocked ? (
                <Alert className="information-box" severity="error">
                  Your wallet is Blocked!
                </Alert>
              ) : (
                <Alert className="information-box" severity="success">
                  Your account is not blocked.
                </Alert>
              )
            }

            {/* Token approval */}
            <Card className="card approve">
              <CardContent>
                <Typography variant="h4" color="textPrimary" gutterBottom>
                  Select Token
                </Typography>
                <form onSubmit={handleApprove}>
                  <FormControl component="fieldset" className="fieldset">
                    <RadioGroup value={approveRadio} onChange={_approveRadioChange}>
                      <FormControlLabel value="sun" control={<Radio />} label="SUN" />
                      <FormControlLabel value="dai" control={<Radio />} label="DAI" />
                      <FormControlLabel value="other" control={<Radio />} label="Other" />
                    </RadioGroup>

                    {approveRadio === "other" && (
                      <TextField id="other-token" name="otherToken" label="Token Address" />
                    )}

                    <Button type="submit" variant="outlined" color="primary">
                      Approve
                    </Button>
                  </FormControl>
                </form>
              </CardContent>
            </Card>

            <Alert className="information-box" severity="info">
              Required SUN tokens for meta-tx: <b>{requiredSunAmount}</b> (Your have: <b>{userSunBalance} SUN</b>)
            </Alert>

            {/* Token transfer */}
            <Card className="card">
              <CardContent>
                <Typography variant="h4" color="textPrimary" gutterBottom>
                  Transfer
                </Typography>
                <form onSubmit={handleTransfer} noValidate autoComplete="off">
                  <FormControl component="fieldset" className="fieldset">
                    <TextField id="receiver" name="receiver" label="To" />
                    <TextField id="amount" name="amount" label="Amount" />
                  </FormControl>

                  <Button type="submit" variant="outlined" color="primary">
                    Sign
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Token swap */}
            <Card className="card swap">
              <CardContent>
                <form onSubmit={handleSwap} noValidate autoComplete="off">
                  <Typography variant="h4" color="textPrimary" gutterBottom>
                    Swap
                  </Typography>
                  <div className="flex">
                    <FormControl className="swap-select">
                      <InputLabel id="swap-token">You want to Swap</InputLabel>
                      <Select
                        labelId="swap-token"
                        id="swap-token-options"
                        value={swapTokenSelect}
                        onChange={event => setSwapTokenSelect(event.target.value)}
                      >
                        <MenuItem value={"sun"}>SUN</MenuItem>
                        <MenuItem value={"dai"}>DAI</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" onClick={getMaxBalance}>Max</Button>
                    <FormControl className="swap-input">
                      <TextField id="swap-token-amount" label="Amount" type="number" onChange={event => setSwapTokenAmount(event.target.value)} value={swapTokenAmount} />
                    </FormControl>
                  </div>
                  <div className="flex">
                    <FormControl className="swap-select">
                      <InputLabel id="target-token">For</InputLabel>
                      <Select
                        labelId="target-token"
                        id="target-token-options"
                        value={swapTargetTokenSelect}
                        onChange={event => setSwapTargetTokenSelect(event.target.value)}
                      >
                        <MenuItem value={"mkr"}>MKR</MenuItem>
                        <MenuItem value={"dai"}>DAI</MenuItem>
                        <MenuItem value={"weth"}>WETH</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl className="swap-input">
                      <TextField id="target-token-amount" label="Amount" InputProps={{ readOnly: true }} value={swapTargetTokenAmount} />
                    </FormControl>
                  </div>
                  <FormControl component="fieldset" className="fieldset">
                    <TextField id="swap-receiver" name="swap-receiver" label="Send swapped tokens to" value={swapReceiverWallet} onChange={(event) => setSwapReceiverWallet(event.target.value)} />
                  </FormControl>
                  <Button type="submit" variant="outlined" color="primary">
                    Swap
                  </Button>
                </form>
             </CardContent>
            </Card>
          </>
          :
          <Card className="card">
            <CardContent>
              <Typography variant="h4" color="textPrimary" gutterBottom>
                Please connect your wallet
              </Typography>
              {walletLoading &&
                <CircularProgress color="secondary" />
              }
            </CardContent>
          </Card>
        }
      </Container>
    </div>
  )
}

export default App
