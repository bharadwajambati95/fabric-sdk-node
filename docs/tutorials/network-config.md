
This tutorial illustrates the use of common connection profiles. Connection profiles are a new feature of the Hyperledger Fabric Node.js Client as of 1.1. A connection profile will describe the Hyperledger Fabric network to the Hyperledger Fabric Node.js Client (fabric client).

For more information on:
* getting started with Hyperledger Fabric see
[Building your first network](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html).
* the configuration of a channel in Hyperledger Fabric and the internal
process of creating and updating see
[Hyperledger Fabric channel configuration](http://hyperledger-fabric.readthedocs.io/en/latest/configtx.html)
* cryptographic generation see
[cryptogen](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html#crypto-generator)
* configuration transaction generator see
[configtxgen](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html#configuration-transaction-generator)
* configuration translation tool see
[configtxlator](https://hyperledger-fabric.readthedocs.io/en/latest/commands/configtxlator.html)

The following assumes an understanding of the Hyperledger Fabric network
(orderers and peers),
and of Node application development, including the use of the
Javascript `Promise`.

### Overview
A connection profile contain entries that describe the Hyperledger Fabric network including entries that describe the fabric client that will access the the network. The application will load a configuration file and then it will be used by fabric client to simplify the steps needed to setup and use the network. The connection profile has specific addresses and settings of network items. Resources like javascript classes to instantiate are stored in the fabric client's configuration system. It will be easier to work with a fabric client loaded with a connection profile configuration because it reduces the setup before calling an action. Parameters for items like targets may be specified by name and object will not have to be created and maintained before the action is called. On many calls if no target peer is specified, the fabric client will look to see if there is a `Peer` in the role needed for the action.

#### API's to load a connection profile
* `Client.loadFromConfig()` - A static utility method to get a fabric client instance loaded with the connection profile configuration.
* `client.loadFromConfig()` - A fabric client instance method to load a connection profile configuration, overriding any existing connection profile configuration settings that may have been set when this client object was created by the call above.

#### new API's that use a loaded connection profile
* `client.initCredentialStores()` - A fabric client instance method to create a state store and assign it to the fabric client instance based on the current settings in the loaded connection profile configuration. It will also create the crypto suite and assign it to the fabric client instance. A crypto store will be created and assigned to crypto suite if needed. (HSM based crypto suites do not require a crypto store).
* `client.setTlsClientCertAndKey(clientCert, clientKey)` -A fabric client instance method that will set a certificate and the corresponding private key on the client instance. Mutual TLS client settings are not stored within the connection profile. When a peer or orderer instance is created for the user from the endpoints defined in the connection profile, these settings will be used as the client mutual TLS settings. When using mutual TLS and a connection profile, this method must be called before endpoints are required. Calling this method is only required when using mutual TLS and a connection profile.
* `channel.newChannelEventHub()` - A fabric channel instance method to create an channel-based event hub based on the current settings in the loaded connection profile configuration of the named peer.
* `channel.getChannelEventHubsForOrg()` - A fabric channel instance method to return a list of channel-based event hubs that are associated with an organizations. Peers in an organizations that have the `eventSource` set to true will be returned.
* `client.getPeersForOrg()` - A fabric client instance method to return a list of peer objects that are associated with an organizations.

#### Modified API's that will use the connection profile configuration if one has been loaded
* `client.getChannel()` - A fabric client instance method that will create a channel instance object based on the settings for a channel defined in the currently loaded connection profile configuration.
* `client.newTransactionID(<boolean>)` - This method was modified to allow for a boolean to indicate that the transaction id generated should be based on the administrative identity if one has been assigned rather than the user context assigned to the fabric client.
* `client.setUserContext()` - Now allows username and password as a parameter or a `User` object. When username and password are used the fabric client will perform an enroll with the certificate authority using the username and password.
* `client.installChaincode()` - If the `targets` parameter is excluded from the request parameter list then the peers defined in the current organization of the client will be used.
* `client.queryXXXX()` - The query API's will now take a peer name (as defined in the connection profile config) or peer object instance as the target.
* `channel.instantiateChaincode()` - If the `targets` parameter is excluded from the request parameter list then the peers defined in the current organization of the client that are also on this channel will be used.
* `channel.sendTransactionProposal()` The request object parameter may use names for targets or let the fabric client find peers to use for targets as defined in the connection profile configuration.
* `channel.sendTransaction()` The request object parameter may use orderer name or let the fabric client find an orderer to use as defined in the connection profile configuration.
* `channel.queryXXXX()` - All the query API's will now take a peer name as the target rather than an peer instance object.

### Loading connection profile configurations
The application code can either point to a yaml or json file that contains the configuration information or it may pass a Javascript object directory to the API's to load a configuration. For convenience there is a static utility method on the `fabric-client` to create a new **fabric client** object and load a connection profile configuration at the same time. There is also a method on the **fabric client** instance that may be used to load a connection profile configuration on top of an existing connection profile configuration.

The following example will create a new instance of the `fabric-client` and load a connection profile configuration. However in this case the connection profile configuration does not contain any information about the client side of the fabric network, just the fabric network elements.
```
var client = Client.loadFromConfig('test/fixtures/network.yaml');
```
Here is the connection profile definition loaded
```
name: "Network"
version: "1.0"

channels:
  mychannel:
    orderers:
      - orderer.example.com
    peers:
      peer0.org1.example.com:
        endorsingPeer: true
        chaincodeQuery: true
        ledgerQuery: true
        eventSource: true
      peer0.org2.example.com:
        endorsingPeer: true
        chaincodeQuery: false
        ledgerQuery: true
        eventSource: false

organizations:
  Org1:
    mspid: Org1MSP
    peers:
      - peer0.org1.example.com
    certificateAuthorities:
      - ca-org1
    adminPrivateKey:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/keystore/9022d671ceedbb24af3ea69b5a8136cc64203df6b9920e26f48123fcfcb1d2e9_sk
    signedCert:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/signcerts/Admin@org1.example.com-cert.pem

  Org2:
    mspid: Org2MSP
    peers:
      - peer0.org2.example.com
    certificateAuthorities:
      - ca-org2
    adminPrivateKey:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/keystore/5a983ddcbefe52a7f9b8ee5b85a590c3e3a43c4ccd70c7795bec504e7f74848d_sk
    signedCert:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/signcerts/Admin@org2.example.com-cert.pem

orderers:
  orderer.example.com:
    url: grpcs://localhost:7050
    grpcOptions:
      ssl-target-name-override: orderer.example.com
      grpc-max-send-message-length: 4194304
    tlsCACerts:
      path: test/fixtures/channel/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tlscacerts/example.com-cert.pem

peers:
  peer0.org1.example.com:
    url: grpcs://localhost:7051
    grpcOptions:
      ssl-target-name-override: peer0.org1.example.com
      grpc.keepalive_time_ms: 600000
    tlsCACerts:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tlscacerts/org1.example.com-cert.pem

  peer0.org2.example.com:
    url: grpcs://localhost:8051
    grpcOptions:
      ssl-target-name-override: peer0.org2.example.com
    tlsCACerts:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tlscacerts/org2.example.com-cert.pem

certificateAuthorities:
  ca-org1:
    url: https://localhost:7054
    httpOptions:
      verify: false
    tlsCACerts:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org1.example.com/ca/org1.example.com-cert.pem
    registrar:
      - enrollId: admin
        enrollSecret: adminpw
    caName: caorg1

  ca-org2:
    url: https://localhost:8054
    httpOptions:
      verify: false
    tlsCACerts:
      path: test/fixtures/channel/crypto-config/peerOrganizations/org2.example.com/ca/org2.example.com-cert.pem
    registrar:
      - enrollId: admin
        enrollSecret: adminpw
    caName: caorg2
```

The following example will have an existing fabric client load a connection profile configuration. The definition will only contain client side definitions and no fabric network definitions. The client may load a new profile at anytime, it will overlay the top level sections it contains of those previously loaded. In this case the file being loaded only has a client section, therefore the loaded definition will now have the previously loaded channels, organizations, peers, orderers, and certificateAuthorities section definitions and the newly loaded client section definition. This allows for an existing fabric client to be able to work within different organization. 
Notice this client definition contains a `connection` section with an `options` attribute in the
client section. Settings defined here will be applied to new peer and orderer
instances the client creates.
This will include peers and orderers that will be created automatically when
using the discovery service.
Peers and Orderers may override these connection settings in their `grpcOptions` settings.

Note: The fabric-client `grpc-max-send-message-length` and `grpc-max-receive-message-length` defaults are -1 (unlimited).
```
client.loadFromConfig('test/fixtures/org1.yaml');
```
Here is the client definition loaded above
```
name: "Org1 Client"
version: "1.0"

client:
  organization: Org1
  credentialStore:
    path: "/tmp/hfc-kvs/org1"
    cryptoStore:
      path: "/tmp/hfc-cvs/org1"
  connection:
    options
      grpc.keepalive_time_ms: 120000
```

### Setup the stores
The next step is to set up the client object with the state and crypto stores. If the client section of the connection profile configuration has these defined then it is a simple matter of running the following. This API is promise based, notice that we will need a `.then` on the returned promise to have it actually execute. This API does not return anything, however it has created a state store and assigned it to the client, it has created a CryptoSuite and also assigned it to the client, and created a crypto store and assigned that to the crypto suite. Notice the credentialStore and cryptoStore definitions above in the client section of the connection profile configuration. In this case we are using two different locations, it may be easier to have these in the same locations when first starting out.

The following will create two stores and a CryptoSuite and assign them to the fabric client all based on the loaded configurations.
```
client.initCredentialStores()
.then((nothing) => {
```

### Work with user context
When there is certificate Authority information on the organization, the fabric client may be used to simplify the enrollment and user context creation. The application will still have to register new users with the certificate authority, however when a connection profile configuration has been loaded there is a simpler way to get a certificate authority client.

So first let's enroll an admin user so that we have the credentials (crypto material) needed to interact with the certificate authority and the fabric network. The following convenience method will first look in the state store (as defined above) to see if the user exist. If the user is not found and there is a connection profile configuration loaded, the fabric client will build a certificate authority client object as defined in the fabric client configuration with the address as defined in the currently loaded connection profile configuration. The fabric client uses the certificate authority client to enroll the admin user with the certificate authority, this requires that a new set of keys be generated on the client side. The fabric client will then use the signed certificate returned by the certificate authority from the enroll to create a user context. The context will then be assign it to fabric client and stored in the state store along with storing the keys in the crypto store. At this point the fabric client is ready to interact with the fabric network and the application may use the returned user object to interact with the certificate authority.

In the following example we are able to enroll the user because it is known by the certificate authority. New users will have to be registered first.
```
client.setUserContext({username:'admin', password:'adminpw'})
.then((admin) => {
```
The following example will have the fabric client build a certificate authority client based on the currently loaded connection profile configuration by first finding which organization defined in the client section and then finding the certificate authority associated with that organization.
```
var fabric_ca_client = client.getCertificateAuthority();
```
Then once we have a fabric-ca-client, we will be able to register new users. We could also use the fabric-ca-client to enroll users and make a few calls to the fabric client to create a user object and then assign that user object to the fabric client, but it will be much easier to just use the convenience method of the fabric client instance. Notice how we have to use the 'admin' user object returned from the client.setUserContext() to do the register. The admin user object has the credentials needed to the register. Then notice we called the same setUserContext method as we did with the admin above, this will have the fabric client object assigned with the 'user1' user context thus providing the credentials to interact with the fabric network. Note that the setUserContext also stores the user context which contains the signed certificate from the certificate authority and newly created public and private keys of the now enrolled user.
```
fabric_ca_client.register({enrollmentID: 'user1', affiliation: 'org1'}, admin)
.then((secret) => {
	return client.setUserContext({username:'user1', password:secret});
}).then((user)=> {
```
### Work with mutual TLS
When your network is using mutual TLS, the client certificate and private key must be available to the client instance before the endpoints are automatically built. The client instance will be able to pass the required material to the endpoint instance that is needed to establish the connection. The example shown will also retrieve the material. These steps must be performed before any actions on the fabric network.
```
// get the CA associated with this client's organization
let fabric_ca_client = client.getCertificateAuthority();

let request = {
	enrollmentID: 'user1',
	enrollmentSecret: secret,
	profile: 'tls'
};

// make the request to build the keys and get the certificate
fabric_ca_client.enroll(request)
.then((enrollment) => {
   // Successfully called the Certificate Authority to get the TLS material
   let key = enrollment.key.toBytes();
   let cert = enrollment.certificate;

   // set the material on the client to be used when building endpoints for the user
   client.setTlsClientCertAndKey(cert, key);
   ...
```

### When an admin is needed
Notice in the organizations section of the connection profile configuration that an organization may have a signed cert setting and admin private key setting that are associated with the organization. This is a convenience for your organization such that operations that require a fabric network administrator will be able to get one easily. These credentials will be assigned to the fabric client when the configuration is loaded. If one has not been assigned than the current user context assigned to the fabric client is assumed to be an administrator. There is also a convenience method on the client object that will assign credentials to the client to be used for operations that require an admin.
```
client.setAdminSigningIdentity('admin privateKey','admin cert');
```

Assume that a common connection profile has been loaded, setting up both an organization with an admin and indicating that the client is in that organization. Then when the call is made to get a transaction id object, the fabric client will check to see if an admin has been assigned to the fabric client and use that to generate the transaction id. The transaction id returned will be tagged that it was generated with the assigned administrative identity. Notice how the request object being built is using just a name for the orderer rather than an `Orderer` object. The fabric client will look up this name in the loaded connection profile configuration. When the `createChannel` call is made, the fabric client will know that this action should be signed by the administrative identity because the transaction id was marked as an admin based transaction. Note that the administrative signing identity is not required if the logged in user is an administrative user and has been assigned to the fabric client.  
```
let tx_id = client.newTransactionID(true);

let request = {
	config: config,
	signatures : signatures,
	name : channel_name,
	orderer : 'orderer.example.com',
	txId  : tx_id
};

return client.createChannel(request);
}).then((result) => {
```


### When a peer is needed
Notice how a peer is added to an organization, it is more than just a reference to the actual peer definition, the peer is also defined to have roles within that organization.
```
peer0.org2.example.com:
  endorsingPeer: true
  chaincodeQuery: false
  ledgerQuery: true
  eventSource: false
 ```
 This peer may be used to endorse transaction, but not used to run chaincode queries. This peer may be used to audit the channel by making ledger based queries (like queryBlock), but may not be used to be an event source. Of course this combination of roles does not make much sense in real life.

 So let's have a look at a chaincode invoke endorsement
 ```
 let tx_id = client.newTransactionID();

 var request = {
	 chaincodeId : 'example',
	 fcn: 'move',
	 args: ['a', 'b','100'],
	 txId: tx_id
 };

 channel.sendTransactionProposal(request)
 .then((results) => {
```
Notice that we have left off the targets parameter of the request object. This will have the fabric client do a lookup of peers on this channel in the connection profile configuration. The fabric client will be looking for peers defined in the role of `endorsingPeer`. The fabric client will then send the proposal to the located peers and return all the endorsements in the `results` object.

There may be a need to have only the peers in a specific organization. Use the mspid of the organization.
```
var peers = getPeersForOrg('Org1MSP');
```
Or maybe for the organization that is defined in the client section of the connection profile.
```
var peers = getPeersForOrg();
```
### When an orderer is needed
After receiving endorsements from the peers for a transaction proposal, they will need to be sent to an orderer along with the proposal for a transaction to be committed to the ledger.
```
var request = {
	proposalResponses: proposalResponses,
	proposal: proposal
};

channel.sendTransaction(request)
.then((results) => {
```
Notice that an orderer to send this transaction to is not included in the request object. The orderer defined in the connection profile configuration will be used.

### When doing queries
When there is a connection profile configuration loaded and the query call is not passed a target peer to use, the fabric client will look in the connection profile configuration for a peer to use.
* These are fabric client based queries and require the user have an admin role or indicate that the admin identity should be used. These queries do not use the connection profile config lookup to find a peer to use and must be passed the target peer.
  - queryChannels
  - queryInstalledChaincodes
* These queries are channel based queries that require a peer with the `ledgerQuery` role.
  - queryInstantiatedChaincodes (user must be an admin or indicate that the assigned admin identity should be used)
  - queryInfo
  - queryBlockByHash
  - queryBlock
  - queryTransaction
* this is a channel based query and requires a peer with the `chaincodeQuery` role.
  - queryByChaincode


### When monitoring for events
Working with an channel-based event hub will not changed when a connection profile configuration has been loaded. A new method has been added to the fabric client to simplify setting up of an ChannelEventHub object. Use the following to get an ChannelEventHub object that will be setup to work with the named peer's channel-based event hub.
```
var channel_event_hub = channel.newChannelEventHub('peer0.org1.example.com');
```
Notice how the parameter to the call is the name of the peer. All settings to create an channel-based event hub are defined by the connection profile configuration under the peer by that name.
```
peer0.org1.example.com:
  url: grpcs://localhost:7051
  grpcOptions:
	ssl-target-name-override: peer0.org1.example.com
	grpc.keepalive_time_ms: 600000
  tlsCACerts:
	path: test/fixtures/channel/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tlscacerts/org1.example.com-cert.pem
```
The following will be a list of event hubs that are within the 'Org1' organization.
All peers referenced by an organization that the 'eventSource' set to true.
Use the mspid of the organization.
```
var channel_event_hubs = channel.getChannelEventHubsForOrg('Org1MSP');
```

The following will be a list of channel-based event hubs that are within the organization defined in the client section of the connection profile.
```
var channel_event_hubs = channel.getChannelEventHubsForOrg();
```

## What does the Fabric Client look for in a common connection profile
The Fabric Client will be looking for the following key names and parameters for those keys:

```
#
# Schema version of the content. Used by the SDK to apply the parsing rules.
#
version: "1.0" # only supported version as of fabric-client v1.3.0

#
# The client section is SDK-specific. These are the settings that the
# NodeSDK will use to automatically set up a Client instance.
#
client:
  # Which organization does this application instance belong to? The value must be the name of an org
  # defined under "organizations" ... see below
  organization: Org1

  # Some SDKs support pluggable KV stores, the properties under "credentialStore"
  # are implementation specific
  credentialStore:
    # Specific to FileKeyValueStore.js or similar implementations in other SDKs. Can be others
    # if using an alternative impl. For instance, CouchDBKeyValueStore.js would require an object
    # here for properties like url, db name, etc.
    path: "/tmp/hfc-kvs"
      or
    <implementation specific properties>

    # Specific to the CryptoSuite implementation. Software-based implementations like
    # CryptoSuite_ECDSA_AES.js in node SDK requires a key store. PKCS#11 based implementations does
    # not.
    cryptoStore:
      # Specific to the underlying KeyValueStore that backs the crypto key store.
      path: "/tmp/hfc-cvs"
       or
    <implementation specific properties>

  # Sets the connection timeouts for new peer and orderer objects when the client creates
  # peer and orderer objects during the client.getPeer() and client.getOrderer() calls
  # or when the peer and orderer objects are created automatically when a channel
  # is created by the client.getChannel() call.
  connection:
    timeout:
       peer:
         # the timeout in seconds to be used on requests to a peer,
         # for example 'sendTransactionProposal'
         endorser: 120
         # the timeout in seconds to be used by applications when waiting for an
         # event to occur. This time should be used in a javascript timer object
         # that will cancel the event registration with the channel event hub instance.
         eventHub: 60
         # the timeout in seconds to be used when setting up the connection
         # with a peer event hub. If the peer does not acknowledge the
         # connection within the time, the application will be notified over the
         # error callback if provided.
         eventReg: 3
       # the timeout in seconds to be used on request to the orderer,
       # for example
       orderer: 30

#
# How a channel is defined and the peers and orderers on that channel. When the
# client.getChannel() call is used the client will pre-populate the channel with
# orderers and peers as defined in this section.
#
channels:
  # name of the channel
  mychannel2:
    # List of orderers designated by the application to use for transactions on this channel.
    # The values must be orderer names defined under "orderers" section
    orderers:
      - orderer.example.com

    # List of peers from participating organizations
    peers:
      # The values must be peer names defined under "peers" section
      peer0.org1.example.com:
        # Will this peer be sent transaction proposals for endorsement? The peer must
        # have the chaincode installed. The app can also use this property to decide which peers
        # to send the chaincode install request. Default: true
        endorsingPeer: true

        # Will this peer be sent query proposals? The peer must have the chaincode
        # installed. The app can also use this property to decide which peers to send the
        # chaincode install request. Default: true
        chaincodeQuery: true

        # Will this peer be sent query proposals that do not require chaincodes, like
        # queryBlock(), queryTransaction(), etc. Default: true
        ledgerQuery: true

        # Will this peer be the target of a SDK listener registration? All peers can
        # produce events but the app typically only needs to connect to one to listen to events.
        # Default: true
        eventSource: true

        # Will this peer be the target of Discovery requests.
        # Default: true
        discover: true

#
# list of participating organizations in this network
#
organizations:
  Org1:
    mspid: Org1MSP

    # The peers that are known to be in this organization
    peers:
      - peer0.org1.example.com

    # Certificate Authorities issue certificates for identification purposes in a Fabric based
    # network. Typically certificates provisioning is done in a separate process outside of the
    # runtime network. Fabric-CA is a special certificate authority that provides a REST APIs for
    # dynamic certificate management (enroll, revoke, re-enroll). The following section is only for
    # Fabric-CA servers.
    certificateAuthorities:
      - ca-org1

    # If the application is going to make requests that are reserved to organization
    # administrators, including creating/updating channels, installing/instantiating chaincodes, it
    # must have access to the admin identity represented by the private key and signing certificate.
    # Both properties can be the PEM string or local path to the PEM file.
	#   path: <the path to a file containing the byte string>
	#    or
	#   pem: <the byte string>
	# Note that this is mainly for convenience in development mode, production systems
	# should not expose sensitive information this way.
	# The SDK should allow applications to set the org admin identity via APIs, and only use
    # this route as an alternative when it exists.
    adminPrivateKey:
      path: <path to file>
       or
      pem: <byte string>
    signedCert:
      path: <path to file>
       or
      pem: <byte string>

  # the profile will contain public information about organizations other than the one it belongs to.
  # These are necessary information to make transaction lifecycles work, including MSP IDs and
  # peers with a public URL to send transaction proposals. The file will not contain private
  # information reserved for members of the organization, such as admin key and certificate,
  # fabric-ca registrar enroll ID and secret, etc.
  Org2:
    mspid: Org2MSP
    peers:
      - peer0.org2.example.com
    certificateAuthorities:
      - ca-org2
    adminPrivateKey:
      path: <path to file>
       or
      pem: <byte string>
    signedCert:
      path: <path to file>
       or
      pem: <byte string>

#
# List of orderers to send transaction and channel create/update requests.
#
orderers:
  orderer.example.com:
    url: grpcs://localhost:7050

    # these are standard properties defined by the gRPC library
    # they will be passed in as-is to gRPC client constructor
    grpcOptions:
      ssl-target-name-override: orderer.example.com

    tlsCACerts:
      path: <path to file>
       or
      pem: <byte string>

#
# List of peers to send various requests to, including endorsement, query
# and event listener registration.
#
peers:
  peer0.org1.example.com:
    # this URL is used to send endorsement and query requests
    url: grpcs://localhost:7051

    grpcOptions:
      ssl-target-name-override: peer0.org1.example.com
      request-timeout: 120001

    tlsCACerts:
      path: <path to file>
       or
      pem: <byte string>

  peer0.org2.example.com:
    url: grpcs://localhost:8051
    grpcOptions:
      ssl-target-name-override: peer0.org2.example.com
    tlsCACerts:
      path: <path to file>
       or
      pem: <byte string>

#
# Fabric-CA is a special kind of Certificate Authority provided by Hyperledger Fabric which allows
# certificate management to be done via REST APIs. Application may choose to use a standard
# Certificate Authority instead of Fabric-CA, in which case this section would not be specified.
#
certificateAuthorities:
  ca-org1:
    url: https://localhost:7054
    # the properties specified under this object are passed to the 'http' client verbatim when
    # making the request to the Fabric-CA server
    httpOptions:
      verify: false
    tlsCACerts:
      path: <path to file>
        or
      pem: <byte string>

    # Fabric-CA supports dynamic user enrollment via REST APIs. A "root" user, a.k.a registrar, is
    # needed to enroll and invoke new users.
    registrar:
      - enrollId: admin
        enrollSecret: adminpw
    # The optional name of the CA.
    caName: ca-org1
```


<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
