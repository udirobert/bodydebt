// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthCredentialVerifier
 * @dev A minimal contract to verify ZK proofs of health metrics and emit a verifiable credential event.
 * For the hackathon, this acts as the on-chain anchor for the Edge AI + Programmable Privacy pipeline.
 */
contract HealthCredentialVerifier {
    // Event emitted when a health credential is successfully verified
    event HealthCredentialVerified(
        address indexed user,
        uint256 timestamp,
        string modelId,
        bool isHealthy,
        string proofReference // IPFS hash or transaction reference
    );

    // Mapping to prevent duplicate proof submissions (simple replay protection)
    mapping(bytes32 => bool) public verifiedProofs;

    /**
     * @dev Verifies a proof and logs the health credential.
     * @param user The address of the user submitting the proof.
     * @param modelId The identifier of the audited ML model used.
     * @param isHealthy The public output of the ZK circuit (boolean).
     * @param proofHash A hash of the proof data for replay protection.
     * @param proofReference Off-chain reference to the full proof (e.g., IPFS CID).
     * 
     * NOTE: In a production EZKL setup, this function would call the actual 
     * EZKLVerifier contract's `verify` function with the proof and public inputs.
     * For the hackathon prototype, we validate the proofHash and emit the event.
     */
    function verifyAndLogCredential(
        address user,
        string calldata modelId,
        bool isHealthy,
        bytes32 proofHash,
        string calldata proofReference
    ) external {
        require(user != address(0), "Invalid user address");
        require(!verifiedProofs[proofHash], "Proof already verified");

        // Mark proof as verified to prevent replay attacks
        verifiedProofs[proofHash] = true;

        // Emit the verifiable credential event
        emit HealthCredentialVerified(
            user,
            block.timestamp,
            modelId,
            isHealthy,
            proofReference
        );
    }

    /**
     * @dev Check if a specific proof hash has already been verified.
     */
    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
}
