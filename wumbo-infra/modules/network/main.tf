data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  selected_azs   = slice(data.aws_availability_zones.available.names, 0, var.availability_zone_count)
  public_azs     = slice(local.selected_azs, 0, var.public_subnet_count)
  nat_gateway_az = var.public_subnet_count > 0 ? local.public_azs[0] : null

  private_subnets = {
    for index, az in local.selected_azs : az => {
      az         = az
      cidr_block = cidrsubnet(var.vpc_cidr, var.private_subnet_newbits, index)
      suffix     = index + 1
    }
  }

  public_subnets = {
    for index, az in local.public_azs : az => {
      az         = az
      cidr_block = cidrsubnet(var.vpc_cidr, var.public_subnet_newbits, var.availability_zone_count + index)
      suffix     = index + 1
    }
  }

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Layer       = "network"
  })
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private"
  })
}

resource "aws_internet_gateway" "this" {
  count = var.public_subnet_count > 0 ? 1 : 0

  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

resource "aws_route_table" "public" {
  count = var.public_subnet_count > 0 ? 1 : 0

  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public"
  })
}

resource "aws_route" "public_internet" {
  count = var.public_subnet_count > 0 ? 1 : 0

  route_table_id         = aws_route_table.public[0].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this[0].id
}

resource "aws_eip" "nat" {
  count = var.nat_gateway_enabled ? 1 : 0

  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip"
  })
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id                  = aws_vpc.this.id
  availability_zone       = each.value.az
  cidr_block              = each.value.cidr_block
  map_public_ip_on_launch = false

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-${each.value.suffix}"
    Tier = "private"
  })
}

resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id                  = aws_vpc.this.id
  availability_zone       = each.value.az
  cidr_block              = each.value.cidr_block
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-${each.value.suffix}"
    Tier = "public"
  })
}

resource "aws_nat_gateway" "this" {
  count = var.nat_gateway_enabled ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[local.nat_gateway_az].id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat"
  })

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route" "private_internet" {
  count = var.nat_gateway_enabled ? 1 : 0

  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public[0].id
}
