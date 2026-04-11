output "vpc_id" {
  description = "ID of the workload VPC."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "CIDR block assigned to the workload VPC."
  value       = aws_vpc.this.cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the isolated private subnets used for database infrastructure."
  value       = values(aws_subnet.private)[*].id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets created for low-cost access patterns like an SSM jump host."
  value       = values(aws_subnet.public)[*].id
}

output "availability_zones" {
  description = "Availability Zones selected for the workload VPC."
  value       = local.selected_azs
}

output "nat_gateway_id" {
  description = "ID of the single NAT gateway used for private subnet egress, if enabled."
  value       = try(aws_nat_gateway.this[0].id, null)
}

output "nat_gateway_public_ip" {
  description = "Public IP allocated to the NAT gateway, if enabled."
  value       = try(aws_eip.nat[0].public_ip, null)
}
