pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract ERC20Permit is ERC20 {
  bytes32 private _DOMAIN_SEPARATOR;
  bytes32 private constant _PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

  mapping(address => uint256) public _nonces;

  constructor (string memory name, string memory symbol) internal ERC20(name, symbol) {
    uint chainId;
    assembly {
        chainId := chainid()
    }

    _DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
        keccak256(bytes(name)),
        keccak256(bytes('1')),
        chainId,
        address(this)
      )
    );
  }

  // Approve by signature

  function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
    external
  {
    require(deadline >= block.timestamp, 'permit: expired permit tx');
    bytes32 digest = keccak256(
      abi.encodePacked(
        '\x19\x01',
        _DOMAIN_SEPARATOR,
        keccak256(abi.encode(_PERMIT_TYPEHASH, owner, spender, value, _nonces[owner]++, deadline))
      )
    );

    address recoveredAddress = ecrecover(digest, v, r, s);
    require(recoveredAddress != address(0) && recoveredAddress == owner, 'permit: invalid signature');

    _approve(owner, spender, value);
  }

  function getNonce(address user) public view returns (uint256 nonce) {
    nonce = _nonces[user];
  }
}